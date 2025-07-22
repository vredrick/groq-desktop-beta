const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Get the base directory for all Groq sessions
function getGroqProjectsDir() {
    return path.join(app.getPath('home'), '.groq', 'projects');
}

// Convert a working directory path to a sanitized session directory name
function sanitizePathForDirectory(workingDir) {
    // Replace path separators with dashes and remove leading/trailing slashes
    return workingDir
        .toLowerCase()
        .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
        .replace(/\//g, '-')        // Replace remaining slashes with dashes
        .replace(/[^a-z0-9-]/g, '-') // Replace any non-alphanumeric chars with dashes
        .replace(/-+/g, '-')        // Collapse multiple dashes
        .replace(/^-+|-+$/g, '');   // Remove leading/trailing dashes
}

// Get the project session directory for a given working directory
function getProjectSessionDir(workingDir) {
    const sanitizedName = sanitizePathForDirectory(workingDir);
    const projectDir = path.join(getGroqProjectsDir(), sanitizedName);
    
    // Store project metadata when creating directory
    ensureDirectoryExists(projectDir);
    const metadataFile = path.join(projectDir, '.project-metadata.json');
    if (!fs.existsSync(metadataFile)) {
        const metadata = {
            originalPath: workingDir,
            name: workingDir.split('/').pop() || workingDir,
            created: new Date().toISOString()
        };
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
    }
    
    return projectDir;
}

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Create a new session file with timestamp
function createNewSession(projectDir) {
    ensureDirectoryExists(projectDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionFile = path.join(projectDir, `session-${timestamp}.jsonl`);
    
    // Create empty file
    fs.writeFileSync(sessionFile, '', 'utf8');
    
    return sessionFile;
}

// Get the most recent session file or create a new one
function getCurrentSession(projectDir) {
    ensureDirectoryExists(projectDir);
    
    try {
        const files = fs.readdirSync(projectDir)
            .filter(f => f.startsWith('session-') && f.endsWith('.jsonl'))
            .sort((a, b) => {
                const statA = fs.statSync(path.join(projectDir, a));
                const statB = fs.statSync(path.join(projectDir, b));
                return statB.mtime - statA.mtime; // Most recent first
            });
        
        if (files.length > 0) {
            return path.join(projectDir, files[0]);
        }
    } catch (error) {
        console.error('Error reading session directory:', error);
    }
    
    // No existing sessions, create a new one
    return createNewSession(projectDir);
}

// Save a message to the current session file
function saveMessage(sessionFile, message) {
    try {
        const messageData = {
            timestamp: new Date().toISOString(),
            type: 'message',
            ...message
        };
        
        // Append as JSONL (one JSON object per line)
        fs.appendFileSync(sessionFile, JSON.stringify(messageData) + '\n', 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving message to session:', error);
        return false;
    }
}

// Save a tool call to the session file
function saveToolCall(sessionFile, toolCall) {
    try {
        const toolData = {
            timestamp: new Date().toISOString(),
            type: 'tool_call',
            ...toolCall
        };
        
        fs.appendFileSync(sessionFile, JSON.stringify(toolData) + '\n', 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving tool call to session:', error);
        return false;
    }
}

// Save a tool result to the session file
function saveToolResult(sessionFile, toolName, result) {
    try {
        const resultData = {
            timestamp: new Date().toISOString(),
            type: 'tool_result',
            tool: toolName,
            result: result
        };
        
        fs.appendFileSync(sessionFile, JSON.stringify(resultData) + '\n', 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving tool result to session:', error);
        return false;
    }
}

// Load messages from a session file
function loadSession(sessionFile) {
    try {
        if (!fs.existsSync(sessionFile)) {
            return [];
        }
        
        const content = fs.readFileSync(sessionFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        const messages = [];
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                messages.push(data);
            } catch (parseError) {
                console.error('Error parsing session line:', parseError);
            }
        }
        
        return messages;
    } catch (error) {
        console.error('Error loading session:', error);
        return [];
    }
}

// List all sessions for a project
function listSessions(projectDir) {
    try {
        if (!fs.existsSync(projectDir)) {
            return [];
        }
        
        const files = fs.readdirSync(projectDir)
            .filter(f => f.startsWith('session-') && f.endsWith('.jsonl'));
        
        const sessions = files.map(file => {
            const filePath = path.join(projectDir, file);
            const stat = fs.statSync(filePath);
            
            // Try to get first message for preview
            let preview = '';
            let messageCount = 0;
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.trim().split('\n').filter(line => line.trim());
                messageCount = lines.filter(line => {
                    try {
                        const data = JSON.parse(line);
                        return data.type === 'message';
                    } catch {
                        return false;
                    }
                }).length;
                
                // Find first user message for preview
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.type === 'message' && data.role === 'user') {
                            preview = data.content;
                            if (typeof preview !== 'string') {
                                // Handle array content format
                                if (Array.isArray(preview)) {
                                    const textPart = preview.find(p => p.type === 'text');
                                    preview = textPart ? textPart.text : '';
                                } else {
                                    preview = '';
                                }
                            }
                            preview = preview.substring(0, 100) + (preview.length > 100 ? '...' : '');
                            break;
                        }
                    } catch {
                        // Skip invalid lines
                    }
                }
            } catch (error) {
                console.error('Error reading session file for preview:', error);
            }
            
            return {
                file: file,
                path: filePath,
                created: stat.birthtime,
                modified: stat.mtime,
                size: stat.size,
                preview: preview,
                messageCount: messageCount
            };
        });
        
        // Sort by modified date, most recent first
        sessions.sort((a, b) => b.modified - a.modified);
        
        return sessions;
    } catch (error) {
        console.error('Error listing sessions:', error);
        return [];
    }
}

// Delete a session file
function deleteSession(sessionFile) {
    try {
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting session:', error);
        return false;
    }
}

// Export session as markdown
function exportSessionAsMarkdown(sessionFile) {
    try {
        const messages = loadSession(sessionFile);
        let markdown = `# Chat Session\n\n`;
        markdown += `**Created:** ${path.basename(sessionFile).replace('session-', '').replace('.jsonl', '')}\n\n`;
        
        for (const item of messages) {
            if (item.type === 'message') {
                let content = item.content;
                if (typeof content !== 'string') {
                    // Handle array content format
                    content = content.map(p => p.type === 'text' ? p.text : '[Image]').join(' ');
                }
                
                if (item.role === 'user') {
                    markdown += `## User\n\n${content}\n\n`;
                } else if (item.role === 'assistant') {
                    markdown += `## Assistant\n\n${content}\n\n`;
                    if (item.tool_calls && item.tool_calls.length > 0) {
                        markdown += `**Tool Calls:**\n`;
                        for (const toolCall of item.tool_calls) {
                            markdown += `- ${toolCall.function.name}(${toolCall.function.arguments})\n`;
                        }
                        markdown += '\n';
                    }
                }
            } else if (item.type === 'tool_call') {
                markdown += `### Tool Call: ${item.name}\n\`\`\`json\n${JSON.stringify(item.arguments, null, 2)}\n\`\`\`\n\n`;
            } else if (item.type === 'tool_result') {
                markdown += `### Tool Result: ${item.tool}\n\`\`\`\n${item.result}\n\`\`\`\n\n`;
            }
        }
        
        return markdown;
    } catch (error) {
        console.error('Error exporting session as markdown:', error);
        return null;
    }
}

// Get all recent projects with their session information
function getRecentProjects() {
    const projectsDir = getGroqProjectsDir();
    
    try {
        if (!fs.existsSync(projectsDir)) {
            return [];
        }
        
        const projectDirs = fs.readdirSync(projectsDir)
            .filter(dir => {
                const dirPath = path.join(projectsDir, dir);
                return fs.statSync(dirPath).isDirectory();
            });
        
        const projects = projectDirs.map(dir => {
            const projectPath = path.join(projectsDir, dir);
            const sessions = listSessions(projectPath);
            
            // Read project metadata
            let originalPath = dir; // fallback to sanitized name
            let projectName = dir;
            
            try {
                const metadataFile = path.join(projectPath, '.project-metadata.json');
                if (fs.existsSync(metadataFile)) {
                    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
                    originalPath = metadata.originalPath || dir;
                    projectName = metadata.name || dir;
                }
            } catch (e) {
                // Fallback to directory name
                projectName = dir.split('-').pop() || dir;
            }
            
            // Get most recent session modification time
            let lastModified = new Date(0);
            if (sessions.length > 0) {
                lastModified = new Date(Math.max(...sessions.map(s => s.modified.getTime())));
            }
            
            return {
                name: projectName,
                path: originalPath,
                fullPath: projectPath,
                sanitizedPath: dir,
                sessionCount: sessions.length,
                lastModified: lastModified.toISOString()
            };
        });
        
        // Filter out projects with no sessions
        return projects.filter(p => p.sessionCount > 0);
    } catch (error) {
        console.error('Error getting recent projects:', error);
        return [];
    }
}

module.exports = {
    getGroqProjectsDir,
    getProjectSessionDir,
    createNewSession,
    getCurrentSession,
    saveMessage,
    saveToolCall,
    saveToolResult,
    loadSession,
    listSessions,
    deleteSession,
    exportSessionAsMarkdown,
    getRecentProjects
};