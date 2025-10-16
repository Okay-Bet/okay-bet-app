/**
 * SPMC Agent Service
 * Handles agent deployment and management operations via the SPMC orchestrator
 */

import {
  SPMCAgent,
  CreateAgentRequest,
  AgentDeploymentStatusResponse,
  AgentContainerStatusResponse,
  AgentLogsResponse,
  CapacityInfo,
  QueueStatus,
  DiskUsageInfo,
  SPMCResponse
} from './types';

// Orchestrator base URL - uses same base as SPMC API
const ORCHESTRATOR_BASE_URL = process.env.NEXT_PUBLIC_SPMC_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_SPMC_URL || 'https://api.spmc.dev';
const API_VERSION = 'v1';

class AgentService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || `${ORCHESTRATOR_BASE_URL}/api/${API_VERSION}`;
  }

  /**
   * Create a new agent for a group
   */
  async createAgent(config: CreateAgentRequest): Promise<SPMCResponse<SPMCAgent>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: config.group_id,
          agent_character: config.agent_character || 'pamela',
          git_tag: config.git_tag,
          deployment_target: config.deployment_target || 'local',
          telegram_bot_id: config.telegram_bot_id,
          telegram_chat_id: config.telegram_chat_id,
          trading_config: config.trading_config
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to create agent: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error creating agent'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Deploy an agent (triggers background deployment)
   * This is fire-and-forget - poll getDeploymentStatus() to track progress
   */
  async deployAgent(agentId: string): Promise<SPMCResponse<{ agent_id: string; status: string; message: string }>> {
    try {
      // Set a short timeout since this should just trigger deployment, not wait for completion
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${this.baseUrl}/agents/${agentId}/deploy`, {
        method: 'POST',
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to deploy agent: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Timeout is expected if deployment takes long - this is OK
        // The deployment is still running in the background
        return {
          success: true,
          data: {
            agent_id: agentId,
            status: 'deployment_initiated',
            message: 'Deployment started in background. Poll status to track progress.'
          },
          timestamp: new Date().toISOString()
        };
      }
      console.error('Error deploying agent:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error deploying agent'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Redeploy a failed agent
   * This deletes the agent record and returns the group_id so you can create a new one
   */
  async redeployAgent(agentId: string): Promise<SPMCResponse<{ group_id: string; message: string }>> {
    try {
      // First get the agent details to find the group_id
      const statusResponse = await this.getDeploymentStatus(agentId);
      if (!statusResponse.success || !statusResponse.data) {
        return {
          success: false,
          error: {
            status: 404,
            message: 'Could not find agent details'
          },
          timestamp: new Date().toISOString()
        };
      }

      const groupId = statusResponse.data.group_id;

      // Delete the failed agent
      const deleteResponse = await this.deleteAgent(agentId);
      if (!deleteResponse.success) {
        return {
          success: false,
          error: deleteResponse.error || {
            status: 500,
            message: 'Failed to delete agent'
          },
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: {
          group_id: groupId,
          message: 'Agent deleted. You can now create a new agent for this group.'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error redeploying agent:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error redeploying agent'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get agent by group ID
   * Uses the endpoint GET /api/v1/groups/{group_id}/agent
   */
  async getAgentByGroupId(groupId: string): Promise<SPMCResponse<SPMCAgent>> {
    try {
      const response = await fetch(`${this.baseUrl}/groups/${groupId}/agent`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to get agent for group: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting agent by group ID:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting agent by group ID'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get deployment status of an agent
   */
  async getDeploymentStatus(agentId: string): Promise<SPMCResponse<AgentDeploymentStatusResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/deployment-status`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to get deployment status: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting deployment status:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting deployment status'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get container status and resource usage (local deployments only)
   */
  async getContainerStatus(agentId: string): Promise<SPMCResponse<AgentContainerStatusResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/container-status`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to get container status: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting container status:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting container status'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get agent logs (local deployments only)
   */
  async getAgentLogs(agentId: string, tail: number = 100): Promise<SPMCResponse<AgentLogsResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/logs?tail=${tail}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to get agent logs: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting agent logs:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting agent logs'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Restart an agent container (local deployments only)
   */
  async restartAgent(agentId: string): Promise<SPMCResponse<{ agent_id: string; container_id: string; status: string; message: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}/restart-local`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to restart agent: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error restarting agent:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error restarting agent'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Delete an agent (does not stop running containers)
   * Uses API proxy because SPMC CORS doesn't allow DELETE method yet
   */
  async deleteAgent(agentId: string, cleanupResources: boolean = true): Promise<SPMCResponse<void>> {
    try {
      const params = new URLSearchParams();
      if (cleanupResources) {
        params.append('cleanup_resources', 'true');
      }

      const response = await fetch(`/api/agents/${agentId}?${params.toString()}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.error || error.detail || `Failed to delete agent: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error deleting agent:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error deleting agent'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get agent capacity information
   */
  async getCapacity(): Promise<SPMCResponse<CapacityInfo>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/capacity`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to get capacity: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting capacity:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting capacity'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get deployment queue status
   */
  async getQueueStatus(): Promise<SPMCResponse<QueueStatus>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/queue-status`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to get queue status: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting queue status'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get Docker disk usage information (local deployments only)
   */
  async getDiskUsage(): Promise<SPMCResponse<DiskUsageInfo>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/disk-usage`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to get disk usage: ${response.statusText}`
          },
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting disk usage:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting disk usage'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all agents across all groups
   * Note: SPMC API doesn't have a dedicated list agents endpoint,
   * so we fetch all groups and then fetch each group's agent
   */
  async getAllAgents(): Promise<SPMCResponse<SPMCAgent[]>> {
    try {
      // Fetch all groups
      const groupsResponse = await fetch(`${this.baseUrl}/groups?limit=100`);

      if (!groupsResponse.ok) {
        return {
          success: false,
          error: {
            status: groupsResponse.status,
            message: 'Failed to fetch groups'
          },
          timestamp: new Date().toISOString()
        };
      }

      const groupsData = await groupsResponse.json();
      const groups = groupsData.groups || [];

      // Fetch agent for each group
      const agentPromises = groups.map(async (group: any) => {
        try {
          const agentResponse = await this.getAgentByGroupId(group.id);
          if (agentResponse.success && agentResponse.data) {
            return agentResponse.data;
          }
          return null;
        } catch {
          return null;
        }
      });

      const agents = (await Promise.all(agentPromises)).filter((agent): agent is SPMCAgent => agent !== null);

      return {
        success: true,
        data: agents,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting all agents:', error);
      return {
        success: false,
        error: {
          status: 500,
          message: error instanceof Error ? error.message : 'Unknown error getting all agents'
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const agentService = new AgentService();
export default AgentService;
