document.addEventListener('DOMContentLoaded', () => {
    // Retrieve content from localStorage (shared extension storage)
    const content = localStorage.getItem('latex_print_content');

    const sanitizeToBody = (str) => {
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

        return doc.body;
    };

    const mountSanitizedHtml = (container, html) => {
        const safeBody = sanitizeToBody(html);
        const nodes = [...safeBody.childNodes].map((node) => node.cloneNode(true));
        container.replaceChildren(...nodes);
    };

    if (content) {
        const container = document.getElementById('content');
        mountSanitizedHtml(container, content);

        const titleText = container.querySelector('.title-h1')?.textContent?.trim();
        if (titleText) {
            document.title = `${titleText}.pdf`;
        }

        // Brief delay to ensure styles render, then print
        setTimeout(() => {
            window.print();
        }, 500);
    } else {
        const error = document.createElement('p');
        error.textContent = 'Error: No content to print.';
        error.style.color = 'red';
        error.style.textAlign = 'center';
        document.getElementById('content').replaceChildren(error);
    }

    // Cleanup? Maybe keep it so user can reprint.
});
