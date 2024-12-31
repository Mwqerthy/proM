import { WebSocketServer } from 'ws';
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = "AIzaSyAvjnmvwLPo69s5TAlHS2xi4hf16dWjvY4";

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);


const connections = new Map();

import { OpenAI } from 'openai';


const groq = new Groq({
    apiKey: "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",
});



async function analyzeImage(imageData, que, options) {
    try {
        // Convert base64 to Uint8Array as required by Gemini
        const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Buffer.from(base64Image, 'base64');
        const uint8Array = new Uint8Array(binaryData);

        // Initialize the model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Create the image blob
        const imageBlob = {
            data: uint8Array,
            mimeType: "image/jpeg"  // Adjust if using different image type
        };

        // Create parts array with prompt and image
        const parts = [
            { text: que + "options are:" + options },
            { inlineData: imageBlob }
        ];

        // Generate content
        const result = await model.generateContent({
            contents: [
                { role: "system", message: "You only pick the answer and respond without giving an explanation." },
                { role: "user", parts }
            ]
        });



        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}






const dataList = [];
const highlowList = [];

async function handleOrderingByAi() {
    const dataOptions = dataList.map((item, index) => `${String.fromCharCode(97 + index)}. ${item}`).join("\n");

    const prompts = highlowList.map(
        (highlow) => `${highlow}\n\nOptions:\n${dataOptions}`
    );

    const requests = prompts.map((prompt) =>
        groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gemma2-9b-it",
            temperature: 0.3,
        })

    );
    // to be checked
    const responses = await Promise.all(requests);

    const answers = responses.map(
        (completion) => completion.choices[0]?.message?.content || ""
    );

    return answers;
}

async function handleRemainingElements(answerList) {
    const remainingElements = dataList.filter(
        (item, index) => !answerList.includes(String.fromCharCode(97 + index))
    );

    const remainingOptions = remainingElements.map(
        (item, index) => `${String.fromCharCode(97 + index)}. ${item}`
    ).join("\n");

    const prompt = `${highlowList[0]}\n\nOptions:\n${remainingOptions}`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gemma2-9b-it",
        temperature: 0.3,
    });

    const answer = completion.choices[0]?.message?.content || "";
    return answer;
}


async function checkGPT(imageQuestion) {
    const apiKey = "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"
    const prompt = 'Determine if the question is image-related, meaning it cannot be answered without an image, such as "Name this singer" or "Who is this celebrity." Respond with "1" for image-related questions and "0" otherwise. \n'
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: imageQuestion + prompt }]
        })
    });
    const data = await response.json();
    return data.choices[0].message.content.trim() == '1';
}

async function handleExtensionMessage(message, ws) {
    //unparsed
    const data = message;
    if (data.image) {

        if (checkGPT(data.question)) {

            const iN = analyzeImage(data.image, data.question, data.context);
            ws.send(JSON.stringify({ image: iN }))
        } else {
            targetWs = connections.get('Lab0');
            const prompt = `${data.question}\n${data.context}`;
            const systemMessage = "Analyze the question and choices carefully. Respond with only the chosen answer (A, B, C, or D). If unsure, choose the most reasonable option based on available information. Avoid explanations and citations."
            targetWs.send(JSON.stringify({
                question: systemMessage + prompt,
                type: "mcq"
            }));

        }
    }

    else if (data.isOrdered) {
        const prompts = question.items;
        //to be changed
        const systemMessage = "Analyze the question to identify its core criteria (e.g., time, size, or order). Rephrase the choice into a direct, context-specific question (e.g., 'When was this person born?' or 'What is the average size of...?'). Clarify ambiguous terms based on the question's context. Ensure the query is specific, concise, and avoids 'Provide.' End with: 'No citation. No explanation. Keep the answer in less than 5 words. If the precise answer is unknown, provide the most plausible approximation.'";



        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: "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",
        });

        const requests = prompts.map((prompt) =>
            openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: prompt },
                ],
                model: "gpt-4-turbo", // GPT-4 Turbo model
                temperature: 0.3,
                max_tokens: 20, // Optional: adjust based on your needs
            })
        );

        Promise.all(requests)
            .then((responses) => {
                // Handle the responses
                responses.forEach((response, index) => {
                    ws = connections.get(`Lab${index}`)
                    ws.send(JSON.stringify({
                        question: response
                    }));
                });
            })
            .catch((error) => {
                // Handle any error that occurs in any of the requests
                console.error("Error with concurrent requests:", error);
            });

        //first an dlast finder
        //to be changed -prompt
        systemMessage = [
            "Analyze the question and choices to identify the order being requested (e.g., population, age, chronology). Generate a precise query for the first item in the order (e.g., 'Which one is youngest?' or 'Which event happened first?'). Provide only the query.",
            "Analyze the question and choices to determine the requested order (e.g., population, age, chronology). Generate a precise query identifying the last item in the order (e.g., 'Which one is the oldest?' or 'Which one has the highest population?'). Provide only the query."
        ];

        prompts = [`${data.question}`, `${data.question}`]

        requests = systemMessage.map((systemMessage, index) =>
            openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: prompts[index] },
                ],
                model: "gpt-4-turbo", // GPT-4 Turbo model
                temperature: 0.3,
                max_tokens: 20, // Optional: adjust based on your needs
            })
        );

        Promise.all(requests)
            .then((responses) => {
                // Handle all responses
                responses.forEach((response, index) => {
                    highlowList[index] = response;
                });
            })
            .catch((error) => {
                // Handle errors
                console.error("Error with requests:", error);
            });


    } else {
        const prompt = `${data.question}\n${data.context}`;
        systemMessage = "Analyze the question and choices carefully. Respond with only the chosen answer (A, B, C, or D). If unsure, choose the most reasonable option based on available information. Avoid explanations and citations."

        ws = connections.get('Lab0')
        ws1.send(JSON.stringify({
            question: systemMessage + prompt,
            type: "mcq"
        }));
    }
}



async function main() {
    try {
        const wss = new WebSocketServer({ port: 3000 });
        //
        wss.on('connection', (ws, req) => {
            const urlParams = new URL(req.url, 'http://localhost').searchParams;
            const Id = urlParams.get('Id');
            console.log("connected with => ", Id)
            connections.set(Id, ws);
            console.log(connections)

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);

                    // If message specifies a target extension
                    if (data.Id && data.Id.startsWith('tele')) {
                        const targetWs = connections.get(data.Id);
                        targetWs ? handleExtensionMessage(data, targetWs) : null;
                    }

                    else if (data.Id && data.Id.startsWith('Lab')) {
                        const labIndex = parseInt(data.Id.slice(3)) - 1; // Extract the lab number and convert to index
                        if (labIndex >= 0 && labIndex < 4) {
                            dataList[labIndex] = data.message;
                            if (labIndex == 0 && data.type) {
                                const ws1 = connections.get('tele');
                                ws1.send(JSON.stringify({ mcq: data.message }));
                            }

                            if (dataList.filter(Boolean).length === 4) { // Ensure all 4 elements are filled
                                handleOrderingByAi()
                                    .then((answers) => {
                                        const ws1 = connections.get('tele');
                                        ws1.send(JSON.stringify({ order: ordering }));
                                        handleRemainingElements(answers)
                                            .then((remainingAnswer) => {
                                                dataList = [];
                                                ws1.send(JSON.stringify({ order: remainingAnswer }));
                                            })
                                            .catch((error) => {
                                                console.error("Error with remaining elements request:", error);
                                            });
                                    })
                                    .catch((error) => {
                                        console.error("Error with requests:", error);
                                    });



                                // Include logic to exclude the two ordered and send one more
                            }
                        }
                    }

                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });

            ws.on('close', () => {
                if (Id) connections.delete(Id);
            });
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
