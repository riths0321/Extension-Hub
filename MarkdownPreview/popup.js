document.addEventListener('DOMContentLoaded', () => {
    const startInput = document.getElementById('markup-input');
    const resultDiv = document.getElementById('preview-output');
    const btnCopy = document.getElementById('btn-copy');
    const btnClear = document.getElementById('btn-clear');
    
    // Add debouncing for better performance
    let typingTimer;
    const doneTypingInterval = 300; // 300ms delay
    
    // Initial Conversion (if content exists)
    if (startInput.value) {
        updatePreview();
    }
    
    // Real-time Conversion with debouncing
    startInput.addEventListener('input', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(updatePreview, doneTypingInterval);
    });
    
    function updatePreview() {
        const text = startInput.value;
        const html = window.parseMarkdown(text);
        // Use safer DOM manipulation
        resultDiv.innerHTML = '';
        const temp = document.createElement('div');
        temp.innerHTML = html;
        while (temp.firstChild) {
            resultDiv.appendChild(temp.firstChild);
        }
    }
    
    // Copy to Clipboard with better feedback
    btnCopy.addEventListener('click', () => {
        // Get text content for safer clipboard operation
        const textContent = resultDiv.textContent || resultDiv.innerText || '';
        
        if (!textContent.trim()) {
            alert('Nothing to copy!');
            return;
        }
        
        navigator.clipboard.writeText(textContent).then(() => {
            const originalText = btnCopy.textContent;
            btnCopy.textContent = '✓ Copied!';
            btnCopy.style.background = '#10B981';
            
            setTimeout(() => {
                btnCopy.textContent = originalText;
                btnCopy.style.background = '';
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy to clipboard!');
        });
    });
    
    // Clear Input with confirmation
    btnClear.addEventListener('click', () => {
        if (startInput.value.trim() === '') {
            alert('Already empty!');
            return;
        }
        
        if (confirm('Clear all content?')) {
            startInput.value = '';
            updatePreview();
            startInput.focus();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            btnCopy.click();
        }
        // Escape to clear
        else if (e.key === 'Escape') {
            btnClear.click();
        }
    });
});
