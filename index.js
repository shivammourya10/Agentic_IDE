import readlineSync from 'readline-sync';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config'; // Load environment variables from .env file


const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

//console.log("Google GenAI API Key:", process.env.GOOGLE_GENAI_API_KEY); // Log the API key for debugging
const History = [];


const cryptoCoinDeclaration = {
    name: "cryptoCoin",
    description: "Returns the current price of a cryptocurrency",
    parameters: {
        type: "object",
        properties: {
            coin: {
                type: "string",
                description: "Cryptocurrency name"
            }
        },
        required: ["coin"]
    }
};
const primeDeclaration = {
    name: "checkPrime",
    description: "Checks if a number is prime",
    parameters: {
        type: "object",
        properties: {
            num: {
                type: "number",
                description: "Number to check"
            }
        },
        required: ["num"]
    }
};



async function runAgent(userProblem) {
    History.push({
        role: 'user',
        parts: [{ text: userProblem }]
    });
    while (true) {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: History,
            //Systemconfig
            config: {
                systemInstruction: `You are a helpful AI assistant. You can perform calculations, check the weather, get cryptocurrency prices, and check if a number is prime. Use the provided tools to answer user queries.`,
                tools: [{
                    functionDeclarations: [
                        sumDeclaration,
                        weatherDeclaration,
                        cryptoCoinDeclaration,
                        primeDeclaration
                    ]

                }],
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const { name, args } = response.functionCalls[0];

            const funCall = availableTools[name];
            const result = await funCall(args);

            //model history
            History.push({
                role: 'model',
                parts: [{
                    functionCall: response.functionCalls[0],
                },]
            });
            // If the function call returns a result, you can add it to the history
            const functionResponsePart = {
                functionResponse: {
                    name: name,
                    response: {
                        result: result
                    }
                }
            };
            History.push({
                role: 'user',
                parts: [functionResponsePart]
            });
        }
        else {
            History.push({
                role: 'model',
                parts: [{ text: response.text }]
            });//response.text is the response from the AI model
            console.log(response.text);
            break; // Exit the loop if no function calls are made
        }

    }
}

async function main() {
    while (true) {
        const userProblem = readlineSync.question('Enter your problem: ');
        
        // Check if user wants to stop
        if (userProblem.toLowerCase().includes('stop')) {
            console.log("Goodbye! Thanks for using the AI agent.");
            break;
        }
        
        await runAgent(userProblem);
    }
}
main()