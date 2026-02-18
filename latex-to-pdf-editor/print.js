document.addEventListener('DOMContentLoaded', () => {
    // Retrieve content from localStorage (shared extension storage)
    const content = localStorage.getItem('latex_print_content');

    const sanitizeHtml = (str) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(str, 'text/html');

        // Remove scripts
        doc.querySelectorAll('script').forEach(el => el.remove());

        // Remove dangerous attributes
        doc.querySelectorAll('*').forEach(el => {
            [...el.attributes].forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = attr.value;

                if (
                    name.startsWith('on') ||
                    name === 'style' ||
                    (name === 'href' && value.startsWith('javascript:')) ||
                    (name === 'src' && value.startsWith('javascript:'))
                ) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        return doc.body.innerHTML;
    };

    if (content) {
        document.getElementById('content').innerHTML = sanitizeHtml(content);

        // Brief delay to ensure styles render, then print
        setTimeout(() => {
            document.title = "Resume.pdf"; // Suggest filename
            window.print();
        }, 500);
    } else {
        document.getElementById('content').innerHTML = '<p style="color:red; text-align:center;">Error: No content to print.</p>';
    }

    // Cleanup? Maybe keep it so user can reprint.
});
