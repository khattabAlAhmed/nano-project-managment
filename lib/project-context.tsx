"use client";

import * as React from "react";
import { toast } from "sonner";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  startDate: string;
  endDate: string;
  ownerId: string;
  owner?: {
    id: string;
    clerkUserId: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  projects: Project[];
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
  createProject: (data: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => Promise<Project>;
  updateProject: (
    id: string,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    }
  ) => Promise<Project>;
  archiveProject: (id: string) => Promise<Project>;
}

const ProjectContext = React.createContext<ProjectContextValue | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY = "fms_active_project_id";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = React.useState<Project | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Set active project and persist selection in localStorage
  const setActiveProject = React.useCallback((project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem(LOCAL_STORAGE_KEY, project.id);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  // Fetch projects from the API
  const refreshProjects = React.useCallback(async () => {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();
      setProjects(data);

      // Determine active project
      const savedProjectId = localStorage.getItem(LOCAL_STORAGE_KEY);
      const matchedProject = savedProjectId
        ? data.find((p: Project) => p.id === savedProjectId)
        : null;

      if (matchedProject) {
        setActiveProjectState(matchedProject);
      } else if (data.length > 0) {
        // Default to first active or DRAFT project
        const firstActive = data.find((p: Project) => p.status !== "ARCHIVED") || data[0];
        setActiveProjectState(firstActive);
        localStorage.setItem(LOCAL_STORAGE_KEY, firstActive.id);
      } else {
        setActiveProjectState(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects from the database");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  React.useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Create Project API Call
  const createProject = React.useCallback(
    async (data: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
    }) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create project");
      }

      const newProject = await response.json();
      toast.success("Project created successfully!");
      await refreshProjects();
      setActiveProject(newProject);
      return newProject;
    },
    [refreshProjects, setActiveProject]
  );

  // Update Project API Call
  const updateProject = React.useCallback(
    async (
      id: string,
      data: {
        name?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      }
    ) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update project");
      }

      const updated = await response.json();
      toast.success("Project updated successfully!");
      
      // Update state immediately for smoother UX
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      
      if (activeProject?.id === id) {
        setActiveProjectState(updated);
      }

      // Refresh full list in background
      refreshProjects();
      return updated;
    },
    [activeProject, refreshProjects]
  );

  // Archive Project API Call (utilizes the DELETE endpoint)
  const archiveProject = React.useCallback(
    async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to archive project");
      }

      const archived = await response.json();
      toast.success("Project archived successfully");

      setProjects((prev) => prev.map((p) => (p.id === id ? archived : p)));
      
      if (activeProject?.id === id) {
        setActiveProjectState(archived);
      }

      refreshProjects();
      return archived;
    },
    [activeProject, refreshProjects]
  );

  const value = React.useMemo(
    () => ({
      activeProject,
      setActiveProject,
      projects,
      isLoading,
      refreshProjects,
      createProject,
      updateProject,
      archiveProject,
    }),
    [
      activeProject,
      setActiveProject,
      projects,
      isLoading,
      refreshProjects,
      createProject,
      updateProject,
      archiveProject,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const context = React.useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
