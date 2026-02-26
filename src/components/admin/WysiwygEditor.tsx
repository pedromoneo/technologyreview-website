"use client";

import { useState, useRef } from "react";
import { Bold, Italic, Link, List, Quote, Heading1, Heading2, Code, Eye } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

interface WysiwygEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function WysiwygEditor({ value, onChange, placeholder, className }: WysiwygEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mode, setMode] = useState<"visual" | "html">("html");

    const insertTag = (tag: string, endTag?: string) => {
        if (mode !== "html") return;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const actualEndTag = endTag || tag.replace("<", "</");

        const newValue =
            value.substring(0, start) +
            tag + selectedText + actualEndTag +
            value.substring(end);

        onChange(newValue);

        // Reset focus and selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, end + tag.length);
        }, 0);
    };

    return (
        <div className={`flex flex-col border-2 border-transparent focus-within:border-accent rounded-[2rem] overflow-hidden transition-all bg-gray-50 ${className}`}>
            <div className="flex items-center justify-between p-2 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center space-x-1">
                    <ToolbarButton
                        icon={<Heading1 className="w-4 h-4" />}
                        onClick={() => insertTag("<h1>", "</h1>")}
                        tooltip="Título 1"
                        disabled={mode === "visual"}
                    />
                    <ToolbarButton
                        icon={<Heading2 className="w-4 h-4" />}
                        onClick={() => insertTag("<h2>", "</h2>")}
                        tooltip="Título 2"
                        disabled={mode === "visual"}
                    />
                    <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                    <ToolbarButton
                        icon={<Bold className="w-4 h-4" />}
                        onClick={() => insertTag("<strong>", "</strong>")}
                        tooltip="Negrita"
                        disabled={mode === "visual"}
                    />
                    <ToolbarButton
                        icon={<Italic className="w-4 h-4" />}
                        onClick={() => insertTag("<em>", "</em>")}
                        tooltip="Itálica"
                        disabled={mode === "visual"}
                    />
                    <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                    <ToolbarButton
                        icon={<Link className="w-4 h-4" />}
                        onClick={() => insertTag('<a href="#">', "</a>")}
                        tooltip="Link"
                        disabled={mode === "visual"}
                    />
                    <ToolbarButton
                        icon={<List className="w-4 h-4" />}
                        onClick={() => insertTag("<ul><li>", "</li></ul>")}
                        tooltip="Lista"
                        disabled={mode === "visual"}
                    />
                    <ToolbarButton
                        icon={<Quote className="w-4 h-4" />}
                        onClick={() => insertTag("<blockquote>", "</blockquote>")}
                        tooltip="Cita"
                        disabled={mode === "visual"}
                    />
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setMode("visual")}
                        className={`flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === "visual" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <Eye className="w-3 h-3 mr-2" />
                        Visual
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("html")}
                        className={`flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === "html" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        <Code className="w-3 h-3 mr-2" />
                        HTML
                    </button>
                </div>
            </div>

            {mode === "html" ? (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full flex-1 p-8 text-[13px] font-mono outline-none bg-transparent min-h-[500px] resize-y leading-relaxed text-blue-900"
                />
            ) : (
                <div className="w-full flex-1 p-8 min-h-[500px] bg-white overflow-auto shadow-inner">
                    <style jsx>{`
                        .preview-container {
                            max-width: 100%;
                        }
                        .preview-container :global(img) {
                            max-width: 100%;
                            height: auto;
                            border-radius: 1rem;
                            margin: 2rem 0;
                            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
                        }
                        .preview-container :global(blockquote) {
                            border-left: 4px solid var(--accent, #7DEE8D);
                            padding-left: 1.5rem;
                            font-style: italic;
                            color: #666;
                            margin: 2rem 0;
                            background: #fcfcfc;
                            padding: 1.5rem;
                            border-radius: 0 1rem 1rem 0;
                        }
                        .preview-container :global(h1) {
                            font-size: 2.5rem;
                            margin-bottom: 1.5rem;
                        }
                    `}</style>
                    <div
                        className="article-content preview-container max-w-none font-serif"
                        dangerouslySetInnerHTML={{ __html: value ? DOMPurify.sanitize(value) : `<p class="text-gray-300 italic">No hay contenido para previsualizar...</p>` }}
                    />
                </div>
            )}
        </div>
    );
}

function ToolbarButton({ icon, onClick, tooltip, disabled }: { icon: React.ReactNode, onClick: () => void, tooltip: string, disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all group relative ${disabled ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:text-primary'}`}
            title={tooltip}
        >
            {icon}
            {!disabled && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {tooltip}
                </span>
            )}
        </button>
    );
}
