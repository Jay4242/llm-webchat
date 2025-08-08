document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const addUserMessageButton = document.getElementById('add-user-message-button');
    const addAssistantMessageButton = document.getElementById('add-assistant-message-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const exportJsonButton = document.getElementById('export-json-button');
    const jsonOverlay = document.getElementById('json-overlay');
    const jsonDisplay = document.getElementById('json-display');
    const closeOverlayButton = document.getElementById('close-overlay-button');
    const themeToggle = document.getElementById('theme-toggle');
    const branchSelect = document.getElementById('branch-select');
    const deleteBranchButton = document.getElementById('delete-branch-button');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsOverlay = document.getElementById('settings-overlay');
    const llmUrlInput = document.getElementById('llm-url-input');
    const systemPromptInput = document.getElementById('system-prompt-input');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const cancelSettingsButton = document.getElementById('cancel-settings-button');

    // Load theme preference from localStorage
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if (currentTheme === 'dark-mode') {
            themeToggle.textContent = '🌙';
        } else {
            themeToggle.textContent = '☀️';
        }
    }

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light-mode');
            themeToggle.textContent = '☀️';
        } else {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark-mode');
            themeToggle.textContent = '🌙';
        }
    });

    // LLM Settings Logic
    const DEFAULT_LLM_URL = 'http://localhost:9090/v1';
    let currentLlmUrl = localStorage.getItem('llmBaseUrl') || DEFAULT_LLM_URL;
    let currentSystemPrompt = localStorage.getItem('systemPrompt') || '';
    
    llmUrlInput.value = currentLlmUrl; // Set initial value in input field
    systemPromptInput.value = currentSystemPrompt; // Set initial value in system prompt input

    settingsToggle.addEventListener('click', () => {
        llmUrlInput.value = currentLlmUrl; // Populate with current URL when opening
        settingsOverlay.style.display = 'flex';
    });

    saveSettingsButton.addEventListener('click', () => {
        const newUrl = llmUrlInput.value.trim();
        const newSystemPrompt = systemPromptInput.value.trim();
        
        if (newUrl) {
            currentLlmUrl = newUrl;
            localStorage.setItem('llmBaseUrl', newUrl);
            console.log('LLM Base URL saved:', newUrl);
        } else {
            currentLlmUrl = DEFAULT_LLM_URL;
            localStorage.removeItem('llmBaseUrl');
            console.log('LLM Base URL reset to default:', DEFAULT_LLM_URL);
        }
        
        currentSystemPrompt = newSystemPrompt;
        localStorage.setItem('systemPrompt', newSystemPrompt);
        console.log('System prompt saved:', newSystemPrompt);
        
        settingsOverlay.style.display = 'none';
    });

    cancelSettingsButton.addEventListener('click', () => {
        settingsOverlay.style.display = 'none';
    });

    let messageIdCounter = 0;
    let branchIdCounter = 0;
    let conversationBranches = [];
    let currentBranchId = null;

    const updateBranchSelect = () => {
        branchSelect.innerHTML = '';
        conversationBranches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.textContent = `Branch ${branch.id.split('-')[1]}`;
            branchSelect.appendChild(option);
        });
        branchSelect.value = currentBranchId;
    };

    const deleteBranch = (branchId) => {
        if (conversationBranches.length <= 1) {
            // Clear the conversation and reset to Branch 0
            if (confirm('This will clear the entire conversation. Are you sure?')) {
                conversationBranches = [{
                    id: 'branch-0',
                    messages: []
                }];
                currentBranchId = 'branch-0';
                updateBranchSelect();
                renderBranch(currentBranchId);
            }
            return;
        }

        if (confirm('Are you sure you want to delete this branch?')) {
            conversationBranches = conversationBranches.filter(branch => branch.id !== branchId);
            
            if (currentBranchId === branchId) {
                // Switch to the first remaining branch
                currentBranchId = conversationBranches[0].id;
            }
            
            updateBranchSelect();
            renderBranch(currentBranchId);
        }
    };

    const createNewBranch = (branchFromMessageId = null) => {
        const newBranchId = `branch-${branchIdCounter++}`;
        let newMessages = [];

        if (branchFromMessageId !== null) {
            const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
            if (currentBranch) {
                const branchPointIndex = currentBranch.messages.findIndex(msg => msg.id === branchFromMessageId);
                if (branchPointIndex !== -1) {
                    newMessages = currentBranch.messages.slice(0, branchPointIndex + 1).map(msg => ({ ...msg }));
                }
            }
        }

        const newBranch = {
            id: newBranchId,
            messages: newMessages,
        };
        conversationBranches.push(newBranch);
        currentBranchId = newBranchId;
        updateBranchSelect(); // Update dropdown when a new branch is created
        return newBranch;
    };

    // Initialize the first branch
    createNewBranch();

    const renderBranch = (branchId) => {
        chatHistory.innerHTML = ''; // Clear current messages
        const branchToRender = conversationBranches.find(branch => branch.id === branchId);
        if (branchToRender) {
            branchToRender.messages.forEach(msg => {
                appendMessageToDOM(msg.sender, msg.text, msg.id, msg.checked);
            });
            currentBranchId = branchId;
            updateBranchSelect(); // Update dropdown when branch is rendered
        }
        chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    const appendMessageToDOM = (sender, messageText, messageId, isChecked = true) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        messageElement.dataset.messageId = messageId; // Store messageId on the DOM element

        const messageSpan = document.createElement('span');
        messageSpan.textContent = messageText;
        messageSpan.classList.add('editable');
        messageElement.appendChild(messageSpan);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('message-toggle');
        checkbox.checked = isChecked;
        checkbox.addEventListener('change', () => {
            const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
            const message = currentBranch.messages.find(msg => msg.id === messageId);
            if (message) {
                message.checked = checkbox.checked;
            }
        });
        messageElement.appendChild(checkbox);

        const roleToggle = document.createElement('button');
        roleToggle.classList.add('role-toggle');
        roleToggle.textContent = sender === 'user' ? '👤' : '🤖';
        roleToggle.title = 'Toggle role';
        roleToggle.style.display = 'none';
        messageElement.appendChild(roleToggle);

        const editButton = document.createElement('button');
        editButton.classList.add('edit-button');
        editButton.textContent = 'Edit';
        editButton.title = 'Edit message';
        editButton.style.display = 'none';
        messageElement.appendChild(editButton);

        const branchButton = document.createElement('button');
        branchButton.classList.add('branch-button');
        branchButton.textContent = 'Branch';
        branchButton.title = 'Branch conversation from here';
        branchButton.style.display = 'none';
        messageElement.appendChild(branchButton);

        const deleteBranchButton = document.createElement('button');
        deleteBranchButton.classList.add('delete-branch-button');
        deleteBranchButton.textContent = '🗑️';
        deleteBranchButton.title = 'Delete branch';
        deleteBranchButton.style.display = 'none';
        messageElement.appendChild(deleteBranchButton);

        messageElement.addEventListener('mouseenter', () => {
            editButton.style.display = 'inline-block';
            branchButton.style.display = 'inline-block';
            deleteBranchButton.style.display = 'inline-block';
            roleToggle.style.display = 'inline-block';
        });
        messageElement.addEventListener('mouseleave', () => {
            editButton.style.display = 'none';
            branchButton.style.display = 'none';
            deleteBranchButton.style.display = 'none';
            roleToggle.style.display = 'none';
        });

        roleToggle.addEventListener('click', () => {
            const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
            const message = currentBranch.messages.find(msg => msg.id === messageId);
            if (message) {
                // Toggle role between 'user' and 'assistant'
                const newRole = message.sender === 'user' ? 'assistant' : 'user';
                message.sender = newRole;
                
                // Update the DOM class and button text
                messageElement.className = `message ${newRole}-message`;
                roleToggle.textContent = newRole === 'user' ? '👤' : '🤖';
                
                // Update the message in the data structure
                message.sender = newRole;
            }
        });

        editButton.addEventListener('click', () => {
            const currentText = messageSpan.textContent;
            const textarea = document.createElement('textarea');
            textarea.value = currentText;
            textarea.classList.add('edit-textarea');

            messageElement.replaceChild(textarea, messageSpan);
            editButton.style.display = 'none';
            deleteButton.style.display = 'none';
            branchButton.style.display = 'none';
            roleToggle.style.display = 'none';

            const saveButton = document.createElement('button');
            saveButton.classList.add('save-button');
            saveButton.textContent = 'Save';
            messageElement.appendChild(saveButton);

            const cancelButton = document.createElement('button');
            cancelButton.classList.add('cancel-button');
            cancelButton.textContent = 'Cancel';
            messageElement.appendChild(cancelButton);

            saveButton.addEventListener('click', () => {
                messageSpan.textContent = textarea.value;
                messageElement.replaceChild(messageSpan, textarea);
                messageElement.removeChild(saveButton);
                messageElement.removeChild(cancelButton);
                editButton.style.display = 'inline-block';
                deleteButton.style.display = 'inline-block';
                branchButton.style.display = 'inline-block';
                roleToggle.style.display = 'inline-block';

                // Update the message in the data structure
                const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
                const messageToUpdate = currentBranch.messages.find(msg => msg.id === messageId);
                if (messageToUpdate) {
                    messageToUpdate.text = textarea.value;
                }
            });

            cancelButton.addEventListener('click', () => {
                messageElement.replaceChild(messageSpan, textarea);
                messageElement.removeChild(saveButton);
                messageElement.removeChild(cancelButton);
                editButton.style.display = 'inline-block';
                deleteButton.style.display = 'inline-block';
                branchButton.style.display = 'inline-block';
                roleToggle.style.display = 'inline-block';
            });
        });

        branchButton.addEventListener('click', () => {
            branchFromMessage(messageId);
        });

        deleteBranchButton.addEventListener('click', () => {
            const branchId = currentBranchId;
            deleteBranch(branchId);
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = 'x';
        deleteButton.title = 'Remove message';
        deleteButton.addEventListener('click', () => {
            messageElement.remove();
            // Remove from data structure
            const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
            if (currentBranch) {
                currentBranch.messages = currentBranch.messages.filter(msg => msg.id !== messageId);
            }
        });
        messageElement.appendChild(deleteButton);

        chatHistory.appendChild(messageElement);
    };

    const appendMessage = (sender, messageText, branchFromMessageId = null) => {
        const messageId = `msg-${messageIdCounter++}`;
        const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);

        if (branchFromMessageId) {
            // If branching, create a new branch and set it as current
            const newBranch = createNewBranch(branchFromMessageId);
            // Add the new message to the new branch
            newBranch.messages.push({ id: messageId, sender, text: messageText, checked: true });
            renderBranch(newBranch.id);
        } else {
            // Add message to the current branch
            currentBranch.messages.push({ id: messageId, sender, text: messageText, checked: true });
            appendMessageToDOM(sender, messageText, messageId);
        }
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll to bottom
    };

    const branchFromMessage = (messageId) => {
        const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
        if (!currentBranch) return;

        const branchPointIndex = currentBranch.messages.findIndex(msg => msg.id === messageId);
        if (branchPointIndex === -1) return;

        const newBranch = createNewBranch(messageId);
        renderBranch(newBranch.id);
    };

    const sendMessage = async () => {
        const message = userInput.value.trim();

        // Only append a new message to the chat history if the input is not empty
        if (message !== '') {
            appendMessage('user', message);
            userInput.value = ''; // Clear input
        }

        // Get the current branch messages, which now includes the newly added message if any
        const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
        const chatMessages = currentBranch.messages
            .filter(msg => msg.checked)
            .map(msg => ({ sender: msg.sender, text: msg.text }));

        // If there are no messages to send (empty chat, empty input), do not send an empty request
        // The LLM API typically requires at least one message.
        if (chatMessages.length === 0 && message === '') {
            console.warn('No messages to send. Input and history are empty.');
            return;
        }

        loadingIndicator.style.display = 'block'; // Show loading indicator

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: chatMessages,
                    llmBaseUrl: currentLlmUrl, // Send the configurable URL to the server
                    systemPrompt: currentSystemPrompt // Send the system prompt to the server
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            appendMessage('assistant', data.reply);
        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage('assistant', 'Error: Could not get a response.');
        } finally {
            loadingIndicator.style.display = 'none'; // Hide loading indicator
        }
    };

    sendButton.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    branchSelect.addEventListener('change', (e) => {
        renderBranch(e.target.value);
    });

    deleteBranchButton.addEventListener('click', () => {
        deleteBranch(currentBranchId);
    });

    const addManualMessage = (sender) => {
        const message = userInput.value.trim();
        if (message === '') return;
        appendMessage(sender, message);
        userInput.value = '';
    };

    addUserMessageButton.addEventListener('click', () => addManualMessage('user'));
    addAssistantMessageButton.addEventListener('click', () => addManualMessage('assistant'));

    exportJsonButton.addEventListener('click', () => {
        const currentBranch = conversationBranches.find(branch => branch.id === currentBranchId);
        const conversation = currentBranch.messages
            .filter(msg => msg.checked)
            .map(msg => ({ role: msg.sender, content: msg.text }));
        jsonDisplay.textContent = JSON.stringify(conversation, null, 2);
        jsonOverlay.style.display = 'flex'; // Show the overlay
    });

    closeOverlayButton.addEventListener('click', () => {
        jsonOverlay.style.display = 'none'; // Hide the overlay
    });

    // Initial render of the first branch
    renderBranch(currentBranchId);
});
