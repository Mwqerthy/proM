// content.js
let previousQuestion = '';


//check image format
const getBase64 = async (img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg');
};


// content.js
function findElementByPublicId(publicId) {
    return document.querySelector(`[data-public-id="${publicId}"]`);
}

function getAllOrderedContainers() {
    return Array.from(document.getElementsByClassName('orderedAnswerContainer'));
}

function getElementCoordinates(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
    };
}

async function moveElementToPosition(publicId, desiredPosition) {
    // Get all ordered containers
    const containers = getAllOrderedContainers();
    if (desiredPosition < 0 || desiredPosition >= containers.length) {
        console.error('Invalid position');
        return;
    }

    // Find the element we want to move
    const elementToMove = findElementByPublicId(publicId);
    if (!elementToMove) {
        console.error('Element not found');
        return;
    }

    // Get coordinates of the target position container
    const targetContainer = containers[desiredPosition];
    const targetPos = getElementCoordinates(targetContainer);

    // Get current position of the element we're moving
    const currentPos = getElementCoordinates(elementToMove);

    // Send message to native app with the calculated coordinates
    chrome.runtime.sendNativeMessage('com.example.element_mover',
        {
            action: 'move',
            startX: currentPos.x,
            startY: currentPos.y,
            targetX: targetPos.x,
            targetY: targetPos.y
        },
        response => {
            console.log('Move completed:', response);
        }
    );
}



answerDict = {};


const observer = new MutationObserver(() => {
    const questionElement = document.querySelector('.questionContainer');


    const questionImage = document.querySelector('.question-image');



    if (!questionElement) return;
    const currentQuestion = questionElement.textContent.trim();

    const hasImage = /image/i.test(currentQuestion);

    //shoul be delted
    const isCelebirty = /celebirty/i.test(currentQuestion);


    if (currentQuestion && currentQuestion != previousQuestion) {
        previousQuestion = currentQuestion;

        const isOrdered = document.querySelectorAll('.orderedAnswerContainer').length > 0;
        let questionData = {
            question: currentQuestion,
            isOrdered: isOrdered,
            context: '',
            image: null
        };

        if (isOrdered) {
            const items = Array.from(document.querySelectorAll('.orderedAnswerContainer'))
                .map(el => el.querySelector('.pl-4').textContent.trim());
            console.log('%cOrdering Question:', 'color: #4CAF50; font-weight: bold');
            console.log(currentQuestion);
            console.log('%cItems to order:', 'color: #2196F3; font-weight: bold');
            items.forEach((item, index) => console.log(`${index + 1}. ${item}`));
            questionData.items = items;

            //may change
            questionData.context = 'Items to order: ' + items.join(', ');

            items.forEach((item, index) => {
                const letter = String.fromCharCode(97 + index); // Convert index to A, B, C...
                answerDict[letter] = item.getAttribute('data-public-id');
            });

        } else {
            const options = Array.from(document.querySelectorAll('.answerContainer:not(.orderedAnswerContainer)'))
                .map(el => el.textContent.trim());
            console.log('%cMultiple Choice Question:', 'color: #4CAF50; font-weight: bold');
            console.log(currentQuestion);
            console.log('%cOptions:', 'color: #2196F3; font-weight: bold');
            options.forEach((option, index) => console.log(`${index + 1}. ${option}`));
            questionData.options = options;

            //may change
            questionData.context = 'Options: \n' + options.join(' \n ');
        }

        if (questionImage) {
            questionImage.onload = async () => {
                const base64Result = await getBase64(questionImage);
                questionData.image = {
                    image: base64Result,
                    isCeleb: isCelebrity  // to be removed
                };
            };
        }



        try {
            chrome.runtime.sendMessage({
                type: 'GET_ANSWER',
                data: questionData
            }, response => {
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError.message);
                    return;
                }

                //check if it is correct
                if (response) {
                    if (response.error) {
                        console.error('Error getting answer:', response.error);
                    } else if (response.answer) {


                        //also check  if response has data first before answer
                        if (response.answer.order) {
                            if (response.answer.order.length == 2) {
                                console.log('%cFirst and last:', 'color: #9C27B0; font-weight: bold', response.answer.order);
                                //what if they where there already.
                                moveElementToPosition(answerDict[response.answer.order[0][0], 0]).then(() => {
                                    moveElementToPosition(answerDict[response.answer.order[1][0], 3])
                                })
                            }

                            // prompt check
                            else if (response.answer.order.length == 1) {
                                moveElementToPosition(answerDict[response.answer.order[0][0], 1])
                            }
                        } else {
                            console.log('%cAI Answer:', 'color: #9C27B0; font-weight: bold');
                            console.log(response.answer);
                        }
                    }
                } else {
                    console.error('Received empty response from background script');
                }
            });
        } catch (err) {
            console.error('Error sending message:', err);
        }

        console.log('-----------------next---trivia---------');
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});


