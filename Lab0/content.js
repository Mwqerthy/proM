let observer = null;
let lastResponse = null;
let maxRetries = 50;


function sendResponse(target) {
    const response = target.textContent.trim();
    if (!response || response === lastResponse) return;

    lastResponse = response;
    chrome.runtime.sendMessage({
        type: 'SEND_RESPONSE',
        data: { response }
    }).catch(console.error);
}

function initObserver() {
    observer?.disconnect();

    observer = new MutationObserver(() => {
        const responses = document.querySelectorAll('div.prose.dark\\:prose-invert.inline.leading-normal.break-words.min-w-0');
        const arrows = document.querySelectorAll('svg[data-icon="arrow-right-from-arc"]');

        if (arrows.length == 1) {
            const target = responses[1];
            if (target?.textContent.trim() !== lastResponse) {
                sendResponse(target);
                waitForElement('button[aria-label="Clear Chat"]').then((el) => {
                    el ? el.click() : null;
                })
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}




async function waitForElement(selector, retries = 0) {
    if (retries >= maxRetries) return null;

    const element = document.querySelector(selector);
    if (element) return element;

    await new Promise(r => setTimeout(r, 10));
    return waitForElement(selector, retries + 1);
}

async function submitQuestion(question) {
    const textarea = await waitForElement('textarea[placeholder="Ask anything..."]');
    if (!textarea) return false;

    textarea.value = question;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise(r => setTimeout(r, 10));

    const submit = await waitForElement('button[aria-label="Submit"]');
    if (!submit) return false;

    submit.click();
    return true;
}



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'PING') {
        sendResponse(true);
        return true;
    }

    if (message?.type === 'NEW_QUESTION') {
        expectedCount = message.data.questionCount;
        lastResponse = null;
        submitQuestion(message.data.question).catch(console.error);
        sendResponse(true);
        return true;
    }
    return true;
});

initObserver();

