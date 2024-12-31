let ws;

function initWebSocket() {
    ws = new WebSocket('ws://localhost:3000?Id=tele');

    ws.onopen = () => console.log('Connected to tele Socket');
    ws.onclose = () => setTimeout(initWebSocket, 1000);
    ws.onmessage = (event) => {
        try {
            //stringfy and oarsing error maybe
            const message = JSON.parse(event.data);
            const data = message.order || message.image || message.mcq;
            if (data) sendResponse({ answer: data });
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    };
}

initWebSocket();


//check for persistent connection later
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_ANSWER') {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                question: request.data.question,
                context: request.data.context,
                isOrdered: request.data.isOrdered,
                image: request.data.image || null,
                Id: 'tele',
            }));
        }
        return true; // Required for asynchronous `sendResponse`
    }
});
