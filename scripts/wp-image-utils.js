const fs = require("fs");
const path = require("path");

const PRIMARY_WORDPRESS_HOST = "technologyreview.es";
const RETIRED_WORDPRESS_HOSTS = new Set([
    PRIMARY_WORDPRESS_HOST,
    "www.technologyreview.es",
    "pretr.opinnosites.com",
    "437.6e6.mytemp.website",
]);
const ATTACHMENT_QUERY_PARAM = "attachment_id";
const IMG_TAG_REGEX = /<img\b[^>]*>/gi;
const SRC_ATTR_REGEX = /\ssrc=(["'])([^"']+)\1/i;

function normalizeUrl(value) {
    if (!value || typeof value !== "string") return null;

    try {
        const url = new URL(value.trim());
        url.protocol = "https:";
        return url.toString();
    } catch {
        return null;
    }
}

function isRetiredWordPressUrl(value) {
    const normalizedUrl = normalizeUrl(value);
    if (!normalizedUrl) return false;

    try {
        const url = new URL(normalizedUrl);
        return RETIRED_WORDPRESS_HOSTS.has(url.hostname);
    } catch {
        return false;
    }
}

function getAttachmentId(value) {
    const normalizedUrl = normalizeUrl(value);
    if (!normalizedUrl) return null;

    try {
        const url = new URL(normalizedUrl);
        const attachmentId = url.searchParams.get(ATTACHMENT_QUERY_PARAM);
        return attachmentId && /^\d+$/.test(attachmentId) ? attachmentId : null;
    } catch {
        return null;
    }
}

function splitFilename(filename) {
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex === -1) {
        return {
            stem: filename,
            extension: "",
        };
    }

    return {
        stem: filename.slice(0, lastDotIndex),
        extension: filename.slice(lastDotIndex + 1),
    };
}

function buildAttachmentSourceCandidates(attachment) {
    if (!attachment) return [];

    const candidates = [];
    const addCandidate = (candidate) => {
        const normalizedCandidate = normalizeUrl(candidate);
        if (normalizedCandidate && !candidates.includes(normalizedCandidate)) {
            candidates.push(normalizedCandidate);
        }
    };

    const postDate = String(attachment.post_date || "");
    const year = postDate.slice(0, 4);
    const month = postDate.slice(5, 7);
    const filename = String(attachment.post_title || "").trim();
    const parentId = String(attachment.post_parent || "").trim();
    const { stem, extension } = splitFilename(filename);

    const guidUrl = normalizeUrl(attachment.guid);
    if (guidUrl) {
        const guidPath = new URL(guidUrl).pathname;
        if (guidPath.includes("/wp-content/uploads/")) {
            addCandidate(`https://${PRIMARY_WORDPRESS_HOST}${guidPath}`);
        }
    }

    if (!year || !month || !filename || !parentId || !stem || !extension) {
        return candidates;
    }

    addCandidate(`https://${PRIMARY_WORDPRESS_HOST}/wp-content/uploads/${year}/${month}/${parentId}-${stem}-scaled.${extension}`);
    addCandidate(`https://${PRIMARY_WORDPRESS_HOST}/wp-content/uploads/${year}/${month}/${parentId}-${filename}`);
    addCandidate(`https://${PRIMARY_WORDPRESS_HOST}/wp-content/uploads/${year}/${month}/${filename}`);

    return candidates;
}

function buildAttachmentMap(backupDir) {
    const attachmentsPath = path.join(backupDir, "attachments.jsonl");
    const attachmentById = new Map();

    if (!fs.existsSync(attachmentsPath)) {
        return attachmentById;
    }

    const lines = fs.readFileSync(attachmentsPath, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
        const attachment = JSON.parse(line);
        attachmentById.set(String(attachment.ID), attachment);
    }

    return attachmentById;
}

function resolveRetiredImageCandidates(value, attachmentById) {
    const normalizedUrl = normalizeUrl(value);
    if (!normalizedUrl) return [];

    const attachmentId = getAttachmentId(normalizedUrl);
    if (attachmentId) {
        return buildAttachmentSourceCandidates(attachmentById.get(attachmentId));
    }

    if (!isRetiredWordPressUrl(normalizedUrl)) return [];

    const candidates = [normalizedUrl];
    try {
        const parsed = new URL(normalizedUrl);
        if (parsed.hostname !== PRIMARY_WORDPRESS_HOST) {
            const substituted = new URL(normalizedUrl);
            substituted.hostname = PRIMARY_WORDPRESS_HOST;
            const substitutedUrl = normalizeUrl(substituted.toString());
            if (substitutedUrl && !candidates.includes(substitutedUrl)) {
                candidates.unshift(substitutedUrl);
            }
        }
    } catch {
        // Ignore URL parse errors.
    }
    return candidates;
}

function extractRetiredImageUrlsFromHtml(html, attachmentById) {
    if (!html || typeof html !== "string") return [];

    const urls = new Set();

    for (const tag of html.match(IMG_TAG_REGEX) || []) {
        const srcMatch = tag.match(SRC_ATTR_REGEX);
        if (!srcMatch) continue;

        const src = srcMatch[2];
        if (resolveRetiredImageCandidates(src, attachmentById).length > 0) {
            urls.add(src);
        }
    }

    return Array.from(urls);
}

function replaceRetiredImageUrlsInHtml(html, replacements, attachmentById) {
    if (!html || typeof html !== "string") return html;

    const replacementsMap = replacements instanceof Map
        ? replacements
        : new Map(Object.entries(replacements || {}));

    return html.replace(IMG_TAG_REGEX, (tag) => {
        const srcMatch = tag.match(SRC_ATTR_REGEX);
        if (!srcMatch) return tag;

        const originalSrc = srcMatch[2];
        const normalizedSrc = normalizeUrl(originalSrc);
        const nextSrc = replacementsMap.get(originalSrc) || (normalizedSrc ? replacementsMap.get(normalizedSrc) : null);
        const shouldStripResponsiveAttrs = Boolean(nextSrc) || resolveRetiredImageCandidates(originalSrc, attachmentById).length > 0;

        let nextTag = tag;
        if (nextSrc) {
            nextTag = nextTag.replace(SRC_ATTR_REGEX, ` src=${srcMatch[1]}${nextSrc}${srcMatch[1]}`);
        }

        if (shouldStripResponsiveAttrs) {
            nextTag = nextTag.replace(/\s(?:srcset|sizes)=(["']).*?\1/gi, "");
        }

        return nextTag;
    });
}

function loadMirroredManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        return {
            version: 1,
            aliases: {},
            failures: {},
            items: {},
        };
    }

    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        return {
            version: manifest.version || 1,
            aliases: manifest.aliases || {},
            failures: manifest.failures || {},
            items: manifest.items || {},
        };
    } catch {
        return {
            version: 1,
            aliases: {},
            failures: {},
            items: {},
        };
    }
}

function resolveMirroredAssetUrl(value, attachmentById, manifest) {
    const normalizedUrl = normalizeUrl(value);
    if (!normalizedUrl) return value;

    const candidateUrls = resolveRetiredImageCandidates(normalizedUrl, attachmentById);
    if (candidateUrls.length === 0) {
        return normalizedUrl;
    }

    const aliasedSourceUrl = manifest.aliases[normalizedUrl];
    if (aliasedSourceUrl && manifest.items[aliasedSourceUrl]?.downloadUrl) {
        return manifest.items[aliasedSourceUrl].downloadUrl;
    }

    for (const candidateUrl of candidateUrls) {
        if (manifest.items[candidateUrl]?.downloadUrl) {
            return manifest.items[candidateUrl].downloadUrl;
        }
    }

    return candidateUrls[0] || normalizedUrl;
}

module.exports = {
    buildAttachmentMap,
    extractRetiredImageUrlsFromHtml,
    getAttachmentId,
    isRetiredWordPressUrl,
    loadMirroredManifest,
    normalizeUrl,
    replaceRetiredImageUrlsInHtml,
    resolveMirroredAssetUrl,
    resolveRetiredImageCandidates,
};
