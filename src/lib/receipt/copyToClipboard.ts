export async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    try {
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        if (!copied) {
            throw new Error("Clipboard copy failed.");
        }
    } finally {
        document.body.removeChild(textarea);
    }
}
