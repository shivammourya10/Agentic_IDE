import readlineSync from 'readline-sync';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config'; // Load environment variables from .env file
import {exec} from 'child_process';
import { promisify } from 'util'; // Promisify exec for easier async/await usage
import os from 'os'; // Import os module to get system information


// Function to execute shell commands in Node.js 
// Docs - https://nodejs.org/api/child_process.html

const platform = os.platform(); // Get the current platform (e.g., 'win32', 'linux', 'darwin')

const asyncExecute = promisify(exec); // Promisify exec for easier async/await usage

console.log("Current Platform:", platform); // Log the current platform
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

//console.log("Google GenAI API Key:", process.env.GOOGLE_GENAI_API_KEY); // Log the API key for debugging
const History = [];

async function executeCommand({command}) {
 
    try 
    {
        const { stdout, stderr } = await asyncExecute(command);
        if (stderr) {
            console.error(`Error: ${stderr}`);
            return `Error: ${stderr}`;
        }

    return `Success: ${stdout} || Task completed successfully.`;
    }
    catch (error) 
    {
        console.error(`Error executing command: ${error.message}`);
        return `Error: ${error.message}`;
    }
}

const executeCommnandDeclaration = {
    name: "executeCommand",
    description: "Executes a singl terminal or shell command . A command can be to create a file ,folder write to a file, delete a file, etc.",
    parameters: {
        type: "object",
        properties: {
            command: {
                type: "string",
                description: "It will a single Terminal command. Shell command to execute Example: 'ls -l' or 'mkdir new_folder' or 'echo Hello World > hello.txt' "
            }
        },
        required: ["command"]
    }
};

const availableTools ={
    executeCommand: executeCommand,
}


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
                systemInstruction: `You are a Website builder expert. You have access to a terminal and can execute shell commands. You can create files, folders, write to files, delete files, etc. You can make any file which is required for building frontend website. Use the tools provided to accomplish tasks. Current users operating System is: ${platform}. 

                IMPORTANT: Execute ALL necessary commands to complete the website automatically. Do NOT stop after each command - continue until the entire website is built.

                Your Job:
                1. Understand the user's problem to build a website.
                2. Execute ALL commands needed to build the complete website in sequence.
                3. Use available tools to execute commands automatically.
                4. Only stop when the entire website is complete.
                
                For building websites:
                1. Create the project folder
                2. Create all necessary HTML files (index.html, about.html, contact.html, etc.)
                3. Create CSS file with complete styling
                4. Create JavaScript file if needed
                5. Write complete content to all files
                6. Provide a summary when everything is done
                
                Use commands like:
                - mkdir folder_name
                - touch folder_name/file.html
                - For writing content, use simple echo commands or cat with heredoc
                
                Execute everything automatically until the website is complete!`,
                tools: [{
                    functionDeclarations: [
                        executeCommnandDeclaration
                    ]

                }],
            },
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const { name, args } = response.functionCalls[0];

            const funCall = availableTools[name];
            const result = await funCall(args);
            
            console.log(`Executing: ${args.command || 'command'}`);
            console.log(`Result: ${result}`);

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
            // Continue the loop to let AI execute more commands
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
        console.log("Welcome to the AI Agentic IDE! You can ask me to build a website or solve problems related to web development.");
        const userProblem = readlineSync.question('Enter your idea: ');
        
        // Check if user wants to stop
        if (userProblem.toLowerCase().includes('stop')) {
            console.log("Goodbye! Thanks for using the AI agent.");
            break;
        }
        
        await runAgent(userProblem);
    }
}
main()