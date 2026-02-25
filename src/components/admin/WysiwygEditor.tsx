"use client";

import { useRef } from "react";
import { Bold, Italic, Link, List, Quote, Heading1, Heading2, Code } from "lucide-react";

interface WysiwygEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function WysiwygEditor({ value, onChange, placeholder, className }: WysiwygEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertTag = (tag: string, endTag?: string) => {
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
            <div className="flex items-center space-x-1 p-3 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <ToolbarButton icon={<Heading1 className="w-4 h-4" />} onClick={() => insertTag("<h1>", "</h1>")} tooltip="Título 1" />
                <ToolbarButton icon={<Heading2 className="w-4 h-4" />} onClick={() => insertTag("<h2>", "</h2>")} tooltip="Título 2" />
                <div className="w-[1px] h-4 bg-gray-200 mx-2" />
                <ToolbarButton icon={<Bold className="w-4 h-4" />} onClick={() => insertTag("<strong>", "</strong>")} tooltip="Negrita" />
                <ToolbarButton icon={<Italic className="w-4 h-4" />} onClick={() => insertTag("<em>", "</em>")} tooltip="Itálica" />
                <div className="w-[1px] h-4 bg-gray-200 mx-2" />
                <ToolbarButton icon={<Link className="w-4 h-4" />} onClick={() => insertTag('<a href="#">', "</a>")} tooltip="Link" />
                <ToolbarButton icon={<List className="w-4 h-4" />} onClick={() => insertTag("<ul><li>", "</li></ul>")} tooltip="Lista" />
                <ToolbarButton icon={<Quote className="w-4 h-4" />} onClick={() => insertTag("<blockquote>", "</blockquote>")} tooltip="Cita" />
                <ToolbarButton icon={<Code className="w-4 h-4" />} onClick={() => insertTag("<pre><code>", "</code></pre>")} tooltip="Código" />
            </div>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full flex-1 p-8 text-lg font-medium outline-none bg-transparent min-h-[500px] resize-y font-serif leading-relaxed"
            />
        </div>
    );
}

function ToolbarButton({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick: () => void, tooltip: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-primary transition-all group relative"
            title={tooltip}
        >
            {icon}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {tooltip}
            </span>
        </button>
    );
}
