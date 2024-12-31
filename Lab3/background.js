// background.js
let ws = null;
let type = null;
function injectContentScript(tabId) {
    return chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
    }).catch(() => false);
}
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000?Id=Lab3');

    ws.onmessage = async (event) => {
        const tabs = await chrome.tabs.query({ url: "https://labs.perplexity.ai/*" });
        if (!tabs[0]) return;

        try {
            await chrome.tabs.sendMessage(tabs[0].id, { type: 'PING' });
        } catch {
            await injectContentScript(tabs[0].id);
        }

        event.type ? type = event.type : type = null;

        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'NEW_QUESTION',
            data: JSON.parse(event.question)
        });
    };

    ws.onclose = () => setTimeout(connectWebSocket, 1000);
}

connectWebSocket();

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SEND_RESPONSE' && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message: message.data, id: "Lab3", type: type }));
        type = null;
    }
});