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
   */
  async deleteAgent(agentId: string): Promise<SPMCResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          success: false,
          error: {
            status: response.status,
            message: error.detail || `Failed to delete agent: ${response.statusText}`
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
}

// Export singleton instance
export const agentService = new AgentService();
export default AgentService;
