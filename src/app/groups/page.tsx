'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from "@privy-io/react-auth";
import { spmcClient } from '@/services/spmc/client';
import { SPMCGroup, SPMCMarket, SPMCGroupMarket } from '@/services/spmc/types';
import Navbar from '@/components/Common/Navbar';
import { CreateFundModal } from '@/components/funds/CreateFundModal';
import { GroupFundMetadata } from '@/services/funds/groupFundIntegration.service';
import { InteractivePieChart } from '@/components/groups/InteractivePieChart';

// Market colors for consistent numbering
const MARKET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green  
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

// Helper function to get platform badge styling
const getPlatformBadgeClass = (platform: string) => {
  switch (platform) {
    case 'kalshi':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'polymarket':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'limitless':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

// Helper function to get fund status badge
const getFundStatusBadge = (metadata: GroupFundMetadata | undefined) => {
  if (!metadata?.fund_deployment) return null;
  
  const status = metadata.fund_deployment.status;
  const statusConfig = {
    'deployed': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Deployed' },
    'deposit': { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepting Deposits' },
    'trading': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Trading Active' },
    'redemption': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Redemption Phase' },
    'completed': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
  };
  
  const config = statusConfig[status] || statusConfig['deployed'];
  
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default function GroupsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, login } = usePrivy();
  const [groups, setGroups] = useState<SPMCGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'create'>(
    (searchParams?.get('tab') as 'all' | 'create') || 'all'
  );
  const [fundStatusFilter, setFundStatusFilter] = useState<'all' | 'no-fund' | 'deployed' | 'deposit' | 'trading' | 'redemption' | 'completed'>('all');
  
  // Edit mode states
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<SPMCGroup | null>(null);
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editSearchResults, setEditSearchResults] = useState<SPMCMarket[]>([]);
  const [editSearchLoading, setEditSearchLoading] = useState(false);
  const [editPlatformFilters, setEditPlatformFilters] = useState<{
    polymarket: boolean;
    kalshi: boolean;
    limitless: boolean;
  }>({ polymarket: true, kalshi: true, limitless: true });
  
  // Create form states
  const [newGroup, setNewGroup] = useState({
    title: '',
    description: '',
    group_type: 'index' as 'index' | 'portfolio',
    metadata: {}
  });
  const [isCreating, setIsCreating] = useState(false);
  
  // Search and market selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SPMCMarket[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [platformFilters, setPlatformFilters] = useState<{
    polymarket: boolean;
    kalshi: boolean;
    limitless: boolean;
  }>({ polymarket: true, kalshi: true, limitless: true });
  const [selectedMarkets, setSelectedMarkets] = useState<Array<{
    market_id: string;
    market: SPMCMarket;
    ratio: number;
    outcome: 'yes' | 'no';
  }>>([]); 
  
  // Expanded groups for viewing details
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Fund creation states
  const [showCreateFundModal, setShowCreateFundModal] = useState(false);
  const [selectedGroupForFund, setSelectedGroupForFund] = useState<SPMCGroup | null>(null);
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all groups
  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await spmcClient.listGroups({ limit: 100 });
      if (response.success && response.data) {
        // Filter to only show index and portfolio groups
        const filteredGroups = response.data.groups.filter(
          group => group.group_type === 'index' || group.group_type === 'portfolio'
        );
        setGroups(filteredGroups);
      } else {
        setError('Failed to load groups');
      }
    } catch (err) {
      setError(`Error loading groups: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load group details
  const loadGroupDetails = async (groupId: string) => {
    try {
      const response = await spmcClient.getGroup(groupId);
      if (response.success && response.data) {
        setGroups(prevGroups => 
          prevGroups.map(g => g.id === groupId ? response.data! : g)
        );
        // If we're editing this group, update the editing group as well
        if (editingGroupId === groupId) {
          setEditingGroup(response.data);
        }
        return response.data;
      }
    } catch (err) {
      console.error('Error loading group details:', err);
    }
    return null;
  };

  // Enter edit mode for a group
  const enterEditMode = async (group: SPMCGroup) => {
    // Load full group details first
    const fullGroup = await loadGroupDetails(group.id);
    if (fullGroup) {
      setEditingGroupId(group.id);
      setEditingGroup(fullGroup);
      setExpandedGroups(new Set([group.id]));
    }
  };

  // Exit edit mode
  const exitEditMode = () => {
    setEditingGroupId(null);
    setEditingGroup(null);
    setEditSearchQuery('');
    setEditSearchResults([]);
  };

  // Update market weight in editing group
  const updateEditingMarketWeight = (marketId: string, weight: number) => {
    if (!editingGroup) return;
    
    const updatedMarkets = editingGroup.markets?.map(m => 
      m.market_id === marketId ? { ...m, weight } : m
    ) || [];
    
    setEditingGroup({ ...editingGroup, markets: updatedMarkets });
  };

  // Update market outcome in editing group
  const updateEditingMarketOutcome = (marketId: string, outcome: 'yes' | 'no') => {
    if (!editingGroup) return;
    
    const updatedMarkets = editingGroup.markets?.map(m => 
      m.market_id === marketId ? { ...m, outcome } : m
    ) || [];
    
    setEditingGroup({ ...editingGroup, markets: updatedMarkets });
  };

  // Remove market from editing group (locally)
  const removeMarketFromEditingGroup = (marketId: string) => {
    if (!editingGroup) return;
    
    const updatedMarkets = editingGroup.markets?.filter(m => 
      m.market_id !== marketId
    ) || [];
    
    setEditingGroup({ ...editingGroup, markets: updatedMarkets });
  };

  // Search markets for editing
  const handleEditSearchMarkets = async () => {
    if (!editSearchQuery.trim()) return;
    
    setEditSearchLoading(true);
    try {
      const response = await spmcClient.searchMarkets({ 
        query: editSearchQuery, 
        limit: 50 
      });
      if (response.success && response.data) {
        // Filter by selected platforms
        const filtered = response.data.markets.filter(market => {
          if (market.platform === 'polymarket' && !editPlatformFilters.polymarket) return false;
          if (market.platform === 'kalshi' && !editPlatformFilters.kalshi) return false;
          if (market.platform === 'limitless' && !editPlatformFilters.limitless) return false;
          return true;
        });
        setEditSearchResults(filtered);
      }
    } catch (err) {
      console.error('Error searching markets:', err);
      setError('Failed to search markets');
    } finally {
      setEditSearchLoading(false);
    }
  };

  // Add market to editing group (locally)
  const addMarketToEditingGroup = (market: SPMCMarket) => {
    if (!editingGroup) return;
    
    // Check if market already exists
    if (editingGroup.markets?.some(m => m.market_id === market.id)) {
      return;
    }
    
    const newMarket: SPMCGroupMarket = {
      id: `temp-${Date.now()}`, // Temporary ID
      market_id: market.id,
      market_title: market.title,
      market_platform: market.platform,
      market_current_price: market.prices?.last || 0,
      market_expiration_date: market.expiration_date,
      market_close_time: market.market_close_time,
      market_closes_at: market.closes_at,
      weight: 1,
      position_type: 'long',
      outcome: 'yes',  // Default to YES
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const updatedMarkets = [...(editingGroup.markets || []), newMarket];
    setEditingGroup({ ...editingGroup, markets: updatedMarkets, market_count: updatedMarkets.length });
  };

  // Save all changes to the group
  const saveGroupChanges = async () => {
    if (!editingGroup || !editingGroupId) return;
    
    try {
      // First, update basic group info if changed
      const originalGroup = groups.find(g => g.id === editingGroupId);
      if (originalGroup && (
        originalGroup.title !== editingGroup.title || 
        originalGroup.description !== editingGroup.description
      )) {
        await spmcClient.updateGroup(editingGroupId, {
          title: editingGroup.title,
          description: editingGroup.description
        });
      }
      
      // Get original markets from the server
      const response = await spmcClient.getGroup(editingGroupId);
      const originalMarkets = response.data?.markets || [];
      
      // Find markets to remove (in original but not in edited)
      const marketsToRemove = originalMarkets.filter(
        om => !editingGroup.markets?.some(em => em.market_id === om.market_id)
      );
      
      // Find markets to add (in edited but not in original)
      const marketsToAdd = editingGroup.markets?.filter(
        em => !originalMarkets.some(om => om.market_id === em.market_id)
      ) || [];
      
      // Find markets to update (in both but with different weights/outcomes)
      const marketsToUpdate = editingGroup.markets?.filter(em => {
        const original = originalMarkets.find(om => om.market_id === em.market_id);
        return original && (
          original.weight !== em.weight || 
          original.outcome !== em.outcome
        );
      }) || [];
      
      // Execute all changes
      // Remove markets
      for (const market of marketsToRemove) {
        await spmcClient.removeMarketFromGroup(editingGroupId, market.market_id);
      }
      
      // Add new markets
      if (marketsToAdd.length > 0) {
        const newMarkets = marketsToAdd.map(m => ({
          market_id: m.market_id,
          weight: m.weight || 1,
          position_type: 'long' as const,
          outcome: m.outcome || 'yes' as const
        }));
        await spmcClient.addMarketsToGroup(editingGroupId, newMarkets);
      }
      
      // Update existing markets (remove and re-add with new settings)
      for (const market of marketsToUpdate) {
        await spmcClient.removeMarketFromGroup(editingGroupId, market.market_id);
        await spmcClient.addMarketsToGroup(editingGroupId, [{
          market_id: market.market_id,
          weight: market.weight || 1,
          position_type: 'long' as const,
          outcome: market.outcome || 'yes' as const
        }]);
      }
      
      // Reload groups and exit edit mode
      await loadGroups();
      exitEditMode();
    } catch (err) {
      setError(`Error saving changes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Search markets
  const handleSearchMarkets = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await spmcClient.searchMarkets({ 
        query: searchQuery, 
        limit: 50 
      });
      if (response.success && response.data) {
        // Filter by selected platforms
        const filtered = response.data.markets.filter(market => {
          if (market.platform === 'polymarket' && !platformFilters.polymarket) return false;
          if (market.platform === 'kalshi' && !platformFilters.kalshi) return false;
          if (market.platform === 'limitless' && !platformFilters.limitless) return false;
          return true;
        });
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Error searching markets:', err);
      setError('Failed to search markets');
    } finally {
      setSearchLoading(false);
    }
  };

  // Toggle market selection
  const toggleMarketSelection = (market: SPMCMarket) => {
    const existing = selectedMarkets.find(m => m.market_id === market.id);
    if (existing) {
      setSelectedMarkets(selectedMarkets.filter(m => m.market_id !== market.id));
    } else {
      // Calculate initial ratio for even distribution
      const newRatio = selectedMarkets.length > 0 ? 1 / (selectedMarkets.length + 1) : 1;
      // Adjust existing ratios proportionally
      const adjustedMarkets = selectedMarkets.map(m => ({
        ...m,
        ratio: m.ratio * (selectedMarkets.length / (selectedMarkets.length + 1))
      }));
      setSelectedMarkets([...adjustedMarkets, {
        market_id: market.id,
        market,
        ratio: newRatio,
        outcome: 'yes'  // Default to YES
      }]);
    }
  };

  // Update market ratio
  const updateMarketRatio = (marketId: string, ratio: number) => {
    setSelectedMarkets(selectedMarkets.map(m => 
      m.market_id === marketId ? { ...m, ratio } : m
    ));
  };

  // Update market outcome
  const updateMarketOutcome = (marketId: string, outcome: 'yes' | 'no') => {
    setSelectedMarkets(selectedMarkets.map(m => 
      m.market_id === marketId ? { ...m, outcome } : m
    ));
  };

  // Create group with markets
  const handleCreateGroup = async () => {
    if (!newGroup.title.trim()) {
      setError('Please enter a group title');
      return;
    }

    // Validate ratios sum to 1 if markets are selected and it's an index group
    if (selectedMarkets.length > 0 && newGroup.group_type === 'index') {
      const totalRatio = selectedMarkets.reduce((sum, m) => sum + m.ratio, 0);
      if (Math.abs(totalRatio - 1) > 0.001) {
        setError(`Market ratios must sum to 1.0. Current total: ${totalRatio.toFixed(3)}`);
        return;
      }
    }

    if (isCreating) {
      return; // Prevent duplicate submissions
    }

    setIsCreating(true);
    setError(null); // Clear any previous errors

    try {
      // Create the group
      const groupResponse = await spmcClient.createGroup(newGroup);
      if (groupResponse.success && groupResponse.data) {
        // Add markets if any selected
        if (selectedMarkets.length > 0) {
          const marketsToAdd = selectedMarkets.map(m => ({
            market_id: m.market_id,
            weight: m.ratio,  // Convert ratio back to weight for API
            position_type: 'long' as const,
            outcome: m.outcome
          }));
          await spmcClient.addMarketsToGroup(groupResponse.data.id, marketsToAdd);
        }
        
        // Show success message
        setSuccessMessage(`Successfully created group "${newGroup.title}"${selectedMarkets.length > 0 ? ` with ${selectedMarkets.length} market${selectedMarkets.length > 1 ? 's' : ''}` : ''}`);
        
        // Reset form
        setNewGroup({
          title: '',
          description: '',
          group_type: 'index',
          metadata: {}
        });
        setSelectedMarkets([]);
        setSearchResults([]);
        setSearchQuery('');
        setActiveTab('all');
        
        // Reload groups
        await loadGroups();
      }
    } catch (err) {
      setError(`Error creating group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!groupToDelete || isDeleting) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await spmcClient.deleteGroup(groupToDelete.id);
      setSuccessMessage(`Successfully deleted group "${groupToDelete.title}"`);
      setShowDeleteModal(false);
      setGroupToDelete(null);
      await loadGroups();
    } catch (err) {
      setError(`Error deleting group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Open delete confirmation modal
  const openDeleteModal = (groupId: string, groupTitle: string) => {
    setGroupToDelete({ id: groupId, title: groupTitle });
    setShowDeleteModal(true);
  };

  // Toggle group expansion
  const toggleGroupExpansion = async (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      await loadGroupDetails(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Authentication Check */}
        {ready && !authenticated && (
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-1">Authentication Required</h3>
                <p className="text-yellow-800 mb-3">You need to connect your wallet to create or manage groups and deploy funds.</p>
                <button
                  onClick={() => login()}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-700 font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-500 hover:text-green-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'all'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Groups
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'create'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create New Group
            </button>
          </div>
        </div>

        {/* All Groups Tab */}
        {activeTab === 'all' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-gray-800">
                  {groups.length} group{groups.length !== 1 ? 's' : ''} total
                </p>
                {/* Fund Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Filter:</span>
                  <select
                    value={fundStatusFilter}
                    onChange={(e) => setFundStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="all">All Groups</option>
                    <option value="no-fund">No Fund Deployed</option>
                    <option value="deployed">Fund Deployed</option>
                    <option value="deposit">Accepting Deposits</option>
                    <option value="trading">Trading Active</option>
                    <option value="redemption">Redemption Phase</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <button
                onClick={loadGroups}
                disabled={loading}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loading && groups.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading groups...</p>
                </div>
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Groups Yet</h3>
                <p className="text-gray-800 font-medium mb-4">Create your first group to start organizing markets</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Create First Group
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.filter((group) => {
                  // Apply fund status filter
                  const metadata = group.metadata as GroupFundMetadata;
                  const hasFund = !!metadata?.fund_deployment;
                  const fundStatus = metadata?.fund_deployment?.status;

                  if (fundStatusFilter === 'all') return true;
                  if (fundStatusFilter === 'no-fund') return !hasFund;
                  if (fundStatusFilter === 'deployed') return hasFund;
                  if (fundStatusFilter === 'deposit') return fundStatus === 'deposit';
                  if (fundStatusFilter === 'trading') return fundStatus === 'trading';
                  if (fundStatusFilter === 'redemption') return fundStatus === 'redemption';
                  if (fundStatusFilter === 'completed') return fundStatus === 'completed';
                  return true;
                }).map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const isEditing = editingGroupId === group.id;
                  const displayGroup = isEditing ? editingGroup : group;

                  if (!displayGroup) return null;
                  
                  return (
                    <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={displayGroup.title}
                                  onChange={(e) => setEditingGroup({ ...displayGroup, title: e.target.value })}
                                  className="text-lg font-semibold px-2 py-1 border border-gray-300 rounded text-black"
                                />
                              ) : (
                                <h3 className="text-lg font-bold text-gray-900">{displayGroup.title}</h3>
                              )}
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                displayGroup.group_type === 'index' 
                                  ? 'bg-blue-100 text-blue-700'
                                  : displayGroup.group_type === 'portfolio'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {displayGroup.group_type?.toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-600">
                                {displayGroup.market_count} market{displayGroup.market_count !== 1 ? 's' : ''}
                              </span>
                              {getFundStatusBadge(displayGroup.metadata as GroupFundMetadata)}
                            </div>
                            {isEditing ? (
                              <textarea
                                value={displayGroup.description}
                                onChange={(e) => setEditingGroup({ ...displayGroup, description: e.target.value })}
                                className="w-full text-sm px-2 py-1 border border-gray-300 rounded text-black"
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm text-gray-800 font-medium">{displayGroup.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={saveGroupChanges}
                                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={exitEditMode}
                                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleGroupExpansion(group.id)}
                                  className="p-2 text-gray-500 hover:text-gray-700 transition"
                                >
                                  <svg 
                                    className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => enterEditMode(group)}
                                  className="p-2 text-blue-500 hover:text-blue-700 transition"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                {(group.metadata as GroupFundMetadata)?.fund_deployment ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        const fundAddress = (group.metadata as GroupFundMetadata).fund_deployment?.contract_address;
                                        if (fundAddress) {
                                          router.push(`/funds/${fundAddress}`);
                                        }
                                      }}
                                      className="p-2 text-blue-500 hover:text-blue-700 transition"
                                      title="View Fund"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => router.push(`/groups/${group.id}/trading-instructions`)}
                                      className="p-2 text-purple-500 hover:text-purple-700 transition"
                                      title="Trading Instructions"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedGroupForFund(group);
                                      setShowCreateFundModal(true);
                                    }}
                                    className="p-2 text-green-500 hover:text-green-700 transition"
                                    title="Deploy Fund"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => openDeleteModal(group.id, group.title)}
                                  className="p-2 text-red-500 hover:text-red-700 transition"
                                  title="Delete Group"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isExpanded && displayGroup.markets && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-800">Markets in this group:</h4>
                              {isEditing && (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={editSearchQuery}
                                    onChange={(e) => setEditSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEditSearchMarkets()}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                                    placeholder="Search to add markets..."
                                  />
                                  <button
                                    onClick={handleEditSearchMarkets}
                                    disabled={editSearchLoading}
                                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition disabled:opacity-50"
                                  >
                                    {editSearchLoading ? (
                                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    ) : 'Search'}
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* Platform filters for edit mode */}
                            {isEditing && (
                              <div className="flex items-center gap-2 flex-wrap mt-2">
                                <span className="text-xs font-medium text-gray-600">Filter:</span>
                                <button
                                  onClick={() => setEditPlatformFilters(prev => ({ ...prev, polymarket: !prev.polymarket }))}
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-all ${
                                    editPlatformFilters.polymarket 
                                      ? 'bg-purple-100 text-purple-700 border-purple-300' 
                                      : 'bg-gray-100 text-gray-400 border-gray-300 line-through'
                                  }`}
                                >
                                  PM
                                </button>
                                <button
                                  onClick={() => setEditPlatformFilters(prev => ({ ...prev, kalshi: !prev.kalshi }))}
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-all ${
                                    editPlatformFilters.kalshi 
                                      ? 'bg-green-100 text-green-700 border-green-300' 
                                      : 'bg-gray-100 text-gray-400 border-gray-300 line-through'
                                  }`}
                                >
                                  KS
                                </button>
                              </div>
                            )}
                            
                            {/* Search results for adding markets in edit mode */}
                            {isEditing && editSearchResults.length > 0 && (
                              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-sm font-semibold text-gray-800 mb-3">Search Results ({editSearchResults.length} found):</div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                  {editSearchResults.map((market) => {
                                    const alreadyAdded = displayGroup.markets?.some(m => m.market_id === market.id);
                                    return (
                                      <div
                                        key={market.id}
                                        className={`p-3 bg-white rounded-lg border transition-all ${
                                          alreadyAdded 
                                            ? 'border-gray-300 opacity-60 cursor-not-allowed' 
                                            : 'border-blue-300 cursor-pointer hover:border-primary hover:shadow-md'
                                        }`}
                                        onClick={() => !alreadyAdded && addMarketToEditingGroup(market)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900 line-clamp-1">{market.title}</div>
                                            <div className="flex items-center gap-3 mt-1">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPlatformBadgeClass(market.platform)}`}>
                                                {market.platform}
                                              </span>
                                              {market.prices?.last !== undefined && market.prices.last !== null && (
                                                <span className="text-sm font-bold text-gray-900">
                                                  ${market.prices.last.toFixed(2)}
                                                </span>
                                              )}
                                              {(market.market_close_time || market.closes_at || market.expiration_date) && (
                                                <span className="text-xs text-gray-600">
                                                  Ends: {new Date(market.market_close_time || market.closes_at || market.expiration_date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {alreadyAdded ? (
                                            <span className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-100 rounded">✓ Added</span>
                                          ) : (
                                            <button className="text-sm font-medium text-white bg-primary px-3 py-1 rounded hover:bg-primary/90 transition">
                                              + Add
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              {displayGroup.markets.length > 0 ? (
                                displayGroup.markets.map((groupMarket) => (
                                  <div key={groupMarket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {groupMarket.market_title || 'Loading market title...'}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPlatformBadgeClass(groupMarket.market_platform || '')}`}>
                                          {groupMarket.market_platform}
                                        </span>
                                        {(groupMarket.market_expiration_date || groupMarket.market_close_time || groupMarket.market_closes_at) && (
                                          <span className="text-xs text-gray-600">
                                            Ends: {new Date(groupMarket.market_expiration_date || groupMarket.market_close_time || groupMarket.market_closes_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </span>
                                        )}
                                        {isEditing ? (
                                          <>
                                            {displayGroup.group_type === 'index' && (
                                              <div className="flex items-center gap-1">
                                                <label className="text-xs text-gray-600">Ratio:</label>
                                                <input
                                                  type="number"
                                                  value={groupMarket.weight}
                                                  onChange={(e) => updateEditingMarketWeight(groupMarket.market_id, parseFloat(e.target.value) || 1)}
                                                  className="w-16 text-xs px-1 py-0.5 border border-gray-300 rounded text-black"
                                                  min="0"
                                                  max="1"
                                                  step="0.001"
                                                />
                                              </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-gray-600">Outcome:</span>
                                              <select
                                                value={groupMarket.outcome || 'yes'}
                                                onChange={(e) => updateEditingMarketOutcome(groupMarket.market_id, e.target.value as any)}
                                                className="text-xs px-2 py-1 border border-gray-300 rounded font-medium text-black bg-white"
                                              >
                                                <option value="yes" className="font-medium">YES</option>
                                                <option value="no" className="font-medium">NO</option>
                                              </select>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            {displayGroup.group_type === 'index' && groupMarket.weight !== 1 && (
                                              <span className="text-xs font-semibold text-blue-600">
                                                {(groupMarket.weight * 100).toFixed(1)}% ratio
                                              </span>
                                            )}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                              groupMarket.outcome === 'yes' ? 'bg-green-100 text-green-700' :
                                              groupMarket.outcome === 'no' ? 'bg-red-100 text-red-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {(groupMarket.outcome || 'yes').toUpperCase()}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {groupMarket.market_current_price !== null && groupMarket.market_current_price !== undefined && (
                                        <div className="text-right">
                                          <div className={`text-lg font-bold ${
                                            groupMarket.outcome === 'yes' ? 'text-green-600' :
                                            groupMarket.outcome === 'no' ? 'text-red-600' :
                                            'text-blue-600'
                                          }`}>
                                            ${groupMarket.market_current_price.toFixed(2)}
                                          </div>
                                        </div>
                                      )}
                                      {isEditing && (
                                        <button
                                          onClick={() => removeMarketFromEditingGroup(groupMarket.market_id)}
                                          className="p-1 text-red-500 hover:text-red-700"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-600 text-center py-4">
                                  No markets in this group yet. {isEditing && <span className="font-medium">Use the search bar above to add markets.</span>}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Group Tab */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group Details Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Group Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Group Title *
                  </label>
                  <input
                    type="text"
                    value={newGroup.title}
                    onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g., Tech Stocks Index"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-primary focus:border-primary"
                    rows={3}
                    placeholder="Describe your group..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Group Type
                  </label>
                  <select
                    value={newGroup.group_type}
                    onChange={(e) => setNewGroup({ ...newGroup, group_type: e.target.value as 'index' | 'portfolio' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="index">Index</option>
                    <option value="portfolio">Portfolio</option>
                  </select>
                  {newGroup.group_type === 'index' && (
                    <p className="mt-2 text-xs text-gray-600">
                      Index groups require ratios that sum to 1.0
                    </p>
                  )}
                </div>

                {/* Selected Markets */}
                {selectedMarkets.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
                      <span>Selected Markets ({selectedMarkets.length})</span>
                      <button
                        onClick={() => setSelectedMarkets([])}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Clear all
                      </button>
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {selectedMarkets.map((selected, index) => (
                        <div key={selected.market_id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                      style={{ backgroundColor: MARKET_COLORS[index % MARKET_COLORS.length] }}>
                                  {index + 1}
                                </span>
                                <div className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">
                                  {selected.market.title}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPlatformBadgeClass(selected.market.platform)}`}>
                                  {selected.market.platform}
                                </span>
                                {selected.market.prices?.last !== undefined && selected.market.prices.last !== null && (
                                  <span className={`text-sm font-bold ${
                                    selected.outcome === 'yes' ? 'text-green-600' :
                                    selected.outcome === 'no' ? 'text-red-600' :
                                    'text-blue-600'
                                  }`}>
                                    ${selected.market.prices.last.toFixed(2)}
                                  </span>
                                )}
                                {(selected.market.market_close_time || selected.market.closes_at || selected.market.expiration_date) && (
                                  <span className="text-xs text-gray-600">
                                    Ends: {new Date(selected.market.market_close_time || selected.market.closes_at || selected.market.expiration_date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-semibold text-gray-700">Outcome:</span>
                                  <select
                                    value={selected.outcome}
                                    onChange={(e) => updateMarketOutcome(selected.market_id, e.target.value as any)}
                                    className="text-sm px-3 py-1 border-2 border-gray-300 rounded-lg font-semibold text-black bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="yes" className="font-semibold">YES</option>
                                    <option value="no" className="font-semibold">NO</option>
                                  </select>
                                </div>
                                {newGroup.group_type === 'index' && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-600">Ratio:</label>
                                    <input
                                      type="number"
                                      value={selected.ratio}
                                      onChange={(e) => updateMarketRatio(selected.market_id, parseFloat(e.target.value) || 0)}
                                      className="w-16 text-xs px-2 py-1 border border-gray-300 rounded text-black"
                                      min="0"
                                      max="1"
                                      step="0.001"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleMarketSelection(selected.market)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Pie Chart for Index Groups */}
                {newGroup.group_type === 'index' && selectedMarkets.length > 0 && (
                  <div className="border-t pt-4">
                    <InteractivePieChart
                      markets={selectedMarkets.map(m => ({
                        market_id: m.market_id,
                        market_title: m.market.title,
                        ratio: m.ratio
                      }))}
                      onRatioChange={updateMarketRatio}
                      height={300}
                    />
                  </div>
                )}

                <button
                  onClick={handleCreateGroup}
                  disabled={!newGroup.title.trim() || isCreating}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Group'
                  )}
                </button>
              </div>
            </div>

            {/* Market Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add Markets</h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchMarkets()}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Search for markets to add..."
                      />
                      <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <button
                      onClick={handleSearchMarkets}
                      disabled={searchLoading || !searchQuery.trim()}
                      className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {searchLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Searching...
                        </>
                      ) : 'Search'}
                    </button>
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-20 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Platform Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">Filter by platform:</span>
                  <button
                    onClick={() => setPlatformFilters(prev => ({ ...prev, polymarket: !prev.polymarket }))}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                      platformFilters.polymarket 
                        ? 'bg-purple-100 text-purple-700 border-purple-300' 
                        : 'bg-gray-100 text-gray-400 border-gray-300 line-through'
                    }`}
                  >
                    Polymarket
                  </button>
                  <button
                    onClick={() => setPlatformFilters(prev => ({ ...prev, kalshi: !prev.kalshi }))}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                      platformFilters.kalshi 
                        ? 'bg-green-100 text-green-700 border-green-300' 
                        : 'bg-gray-100 text-gray-400 border-gray-300 line-through'
                    }`}
                  >
                    Kalshi
                  </button>
                  <button
                    onClick={() => setPlatformFilters(prev => ({ ...prev, limitless: !prev.limitless }))}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                      platformFilters.limitless 
                        ? 'bg-blue-100 text-blue-700 border-blue-300' 
                        : 'bg-gray-100 text-gray-400 border-gray-300 line-through'
                    }`}
                  >
                    Limitless
                  </button>
                  <button
                    onClick={() => setPlatformFilters({ polymarket: true, kalshi: true, limitless: true })}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Show all
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        {searchResults.length} market{searchResults.length !== 1 ? 's' : ''} found
                        {(!platformFilters.polymarket || !platformFilters.kalshi || !platformFilters.limitless) && (
                          <span className="text-xs text-gray-500 ml-1">(filtered)</span>
                        )}
                      </span>
                      {selectedMarkets.length > 0 && (
                        <span className="text-sm font-medium text-primary">
                          {selectedMarkets.length} selected
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {searchResults.map((market) => {
                        const isSelected = selectedMarkets.some(m => m.market_id === market.id);
                        return (
                          <div
                            key={market.id}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-primary bg-primary/10 shadow-sm' 
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => toggleMarketSelection(market)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm line-clamp-2">
                                  {market.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPlatformBadgeClass(market.platform)}`}>
                                    {market.platform}
                                  </span>
                                  {market.prices?.last !== undefined && market.prices.last !== null && (
                                    <span className="text-sm font-bold text-gray-900">
                                      ${market.prices.last.toFixed(2)}
                                    </span>
                                  )}
                                  {(market.market_close_time || market.closes_at || market.expiration_date) && (
                                    <span className="text-xs text-gray-600">
                                      Ends: {new Date(market.market_close_time || market.closes_at || market.expiration_date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                  {market.volume_24h && (
                                    <span className="text-xs text-gray-500">
                                      Vol: ${(market.volume_24h / 1000).toFixed(1)}k
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center">
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                  isSelected 
                                    ? 'bg-primary border-primary scale-110' 
                                    : 'border-gray-400 hover:border-gray-600'
                                }`}>
                                  {isSelected && (
                                    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : searchQuery && !searchLoading ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-900">No markets found</p>
                    <p className="text-sm text-gray-600">Try searching with different keywords</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-900">Search for markets</p>
                    <p className="text-sm text-gray-600">Find and add markets to your group</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Fund Modal */}
      {showCreateFundModal && selectedGroupForFund && (
        <CreateFundModal
          isOpen={showCreateFundModal}
          onClose={() => {
            setShowCreateFundModal(false);
            setSelectedGroupForFund(null);
          }}
          groupId={selectedGroupForFund.id}
          groupName={selectedGroupForFund.title}
          group={selectedGroupForFund}
          onSuccess={(fundAddress) => {
            console.log('Fund created for group:', selectedGroupForFund.id, 'Fund address:', fundAddress);
            setShowCreateFundModal(false);
            setSelectedGroupForFund(null);
            // Refresh groups to show updated fund status
            loadGroups();
          }}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Delete Group
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-800">
                        Are you sure you want to delete the group <span className="font-semibold">&quot;{groupToDelete.title}&quot;</span>? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleDeleteGroup}
                  disabled={isDeleting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Deleting...
                    </div>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}