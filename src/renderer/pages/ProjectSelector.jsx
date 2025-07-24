import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

const ProjectSelector = () => {
  const navigate = useNavigate();
  const { setWorkingDirectory } = useChat();
  const [recentProjects, setRecentProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    setIsLoading(true);
    try {
      // Get list of all projects from the session manager
      const projectsDir = await window.electron.getGroqProjectsDir();
      const projects = await window.electron.getRecentProjects();
      
      // Sort by most recent activity
      const sortedProjects = projects.sort((a, b) => 
        new Date(b.lastModified) - new Date(a.lastModified)
      );
      
      setRecentProjects(sortedProjects);
    } catch (error) {
      console.error('Error loading recent projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectSelect = async (projectPath) => {
    // Set the working directory
    const result = await window.electron.setWorkingDirectory(projectPath);
    if (result.success) {
      setWorkingDirectory(projectPath);
      // Navigate to the main chat interface
      navigate('/');
    } else {
      console.error('Failed to set working directory:', result.message);
    }
  };

  const handleNewProject = async () => {
    const result = await window.electron.selectWorkingDirectory();
    if (result.success) {
      await handleProjectSelect(result.directory);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffInHours = Math.floor((now - then) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - then) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl px-8">
        <h1 className="text-4xl font-bold text-center mb-2 text-text-primary">Groq Desktop Projects</h1>
        <p className="text-text-secondary text-center mb-12">Recent projects with Groq sessions</p>

        {/* New Project Button */}
        <button
          onClick={handleNewProject}
          className="w-full mb-8 p-4 bg-surface-primary hover:bg-surface-hover rounded-lg border border-border-primary 
                     flex items-center justify-center gap-2 transition-colors text-text-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-lg">New Project</span>
        </button>

        {/* Recent Sessions Header */}
        {recentProjects.length > 0 && (
          <h2 className="text-sm uppercase text-text-tertiary tracking-wider mb-4">RECENT SESSIONS</h2>
        )}

        {/* Project List */}
        {isLoading ? (
          <div className="text-center text-text-secondary">Loading projects...</div>
        ) : recentProjects.length === 0 ? (
          <div className="text-center text-text-secondary">
            No recent projects found. Click "New Project" to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <button
                key={project.path}
                onClick={() => handleProjectSelect(project.path)}
                className="w-full p-4 bg-surface-primary hover:bg-surface-hover rounded-lg border border-border-primary 
                         text-left transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-text-primary group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-text-tertiary truncate">
                      {project.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 text-sm text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      {project.sessionCount} session{project.sessionCount !== 1 ? 's' : ''}
                    </span>
                    <span>{formatTimeAgo(project.lastModified)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-text-tertiary">
          Groq Desktop · Select a project to continue
        </div>
      </div>
    </div>
  );
};

export default ProjectSelector;