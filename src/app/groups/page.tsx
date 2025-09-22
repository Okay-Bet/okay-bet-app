'use client';

import React, { useState, useEffect } from 'react';
import { spmcClient } from '@/services/spmc/client';
import { SPMCGroup, SPMCMarket } from '@/services/spmc/types';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Stack,
  Grid,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<SPMCGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SPMCGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMarketDialogOpen, setAddMarketDialogOpen] = useState(false);
  const [searchMarkets, setSearchMarkets] = useState<SPMCMarket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Form states
  const [newGroup, setNewGroup] = useState({
    title: '',
    description: '',
    group_type: 'watchlist' as const,
    metadata: {}
  });
  
  const [selectedMarkets, setSelectedMarkets] = useState<Array<{
    market_id: string;
    weight: number;
    position_type: string;
  }>>([]);
  
  // For create group panel
  const [createPanelSearchQuery, setCreatePanelSearchQuery] = useState('');
  const [createPanelMarkets, setCreatePanelMarkets] = useState<SPMCMarket[]>([]);
  const [createPanelSearchLoading, setCreatePanelSearchLoading] = useState(false);
  const [createPanelSelectedMarkets, setCreatePanelSelectedMarkets] = useState<Array<{
    market_id: string;
    weight: number;
    position_type: string;
  }>>([]);
  const [createPanelPage, setCreatePanelPage] = useState(0);
  const [createPanelTotalCount, setCreatePanelTotalCount] = useState(0);
  const [createPanelHasMore, setCreatePanelHasMore] = useState(false);
  const pageSize = 20;

  // Load groups
  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await spmcClient.listGroups({ limit: 100 });
      if (response.success && response.data) {
        setGroups(response.data.groups);
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
        const updatedGroups = groups.map(g => 
          g.id === groupId ? response.data : g
        );
        setGroups(updatedGroups);
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(response.data);
        }
      }
    } catch (err) {
      console.error('Error loading group details:', err);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    try {
      const response = await spmcClient.createGroup(newGroup);
      if (response.success && response.data) {
        await loadGroups();
        setCreateDialogOpen(false);
        setNewGroup({
          title: '',
          description: '',
          group_type: 'watchlist',
          metadata: {}
        });
      } else {
        setError('Failed to create group');
      }
    } catch (err) {
      setError(`Error creating group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Create group with markets (for create panel)
  const handleCreateGroupWithMarkets = async () => {
    try {
      // First create the group
      const groupResponse = await spmcClient.createGroup(newGroup);
      if (groupResponse.success && groupResponse.data) {
        // If markets are selected, add them to the group
        if (createPanelSelectedMarkets.length > 0) {
          await spmcClient.addMarketsToGroup(groupResponse.data.id, createPanelSelectedMarkets);
        }
        
        // Reset form and reload groups
        setNewGroup({
          title: '',
          description: '',
          group_type: 'watchlist',
          metadata: {}
        });
        setCreatePanelSelectedMarkets([]);
        setCreatePanelMarkets([]);
        setCreatePanelSearchQuery('');
        await loadGroups();
        
        // Show success message
        setError(null);
        alert(`Group "${groupResponse.data.title}" created successfully with ${createPanelSelectedMarkets.length} markets!`);
      } else {
        setError('Failed to create group');
      }
    } catch (err) {
      setError(`Error creating group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Search markets for create panel (with pagination)
  const handleCreatePanelSearch = async (page: number = 0) => {
    if (!createPanelSearchQuery.trim()) return;
    
    setCreatePanelSearchLoading(true);
    setCreatePanelPage(page);
    
    try {
      const response = await spmcClient.searchMarkets({ 
        query: createPanelSearchQuery, 
        limit: pageSize,
        offset: page * pageSize
      });
      if (response.success && response.data) {
        setCreatePanelMarkets(response.data.markets);
        
        // Check if there are more results
        // The API returns total_count in the response
        const totalCount = (response as any).data?.totalResults || response.data.markets.length;
        setCreatePanelTotalCount(totalCount);
        setCreatePanelHasMore((page + 1) * pageSize < totalCount);
      }
    } catch (err) {
      console.error('Error searching markets:', err);
      setError(`Error searching markets: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreatePanelSearchLoading(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    
    try {
      await spmcClient.deleteGroup(groupId);
      await loadGroups();
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (err) {
      setError(`Error deleting group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Search markets
  const handleSearchMarkets = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await spmcClient.searchMarkets({ query: searchQuery, limit: 20 });
      if (response.success && response.data) {
        setSearchMarkets(response.data.markets);
      }
    } catch (err) {
      console.error('Error searching markets:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add markets to group
  const handleAddMarketsToGroup = async () => {
    if (!selectedGroup || selectedMarkets.length === 0) return;
    
    try {
      await spmcClient.addMarketsToGroup(selectedGroup.id, selectedMarkets);
      await loadGroupDetails(selectedGroup.id);
      setAddMarketDialogOpen(false);
      setSelectedMarkets([]);
      setSearchMarkets([]);
      setSearchQuery('');
    } catch (err) {
      setError(`Error adding markets: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Remove market from group
  const handleRemoveMarketFromGroup = async (groupId: string, marketId: string) => {
    try {
      await spmcClient.removeMarketFromGroup(groupId, marketId);
      await loadGroupDetails(groupId);
    } catch (err) {
      setError(`Error removing market: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      loadGroupDetails(groupId); // Load full details when expanding
    }
    setExpandedGroups(newExpanded);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const renderGroupCard = (group: SPMCGroup) => {
    const isExpanded = expandedGroups.has(group.id);
    
    return (
      <Card key={group.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="h6">{group.title}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {group.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip 
                  label={group.group_type} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label={`${group.market_count} markets`} 
                  size="small" 
                />
                {group.is_system_generated && (
                  <Chip label="System" size="small" color="secondary" />
                )}
              </Stack>
            </Box>
            <Box>
              <IconButton 
                size="small" 
                onClick={() => toggleGroupExpansion(group.id)}
              >
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => {
                  setSelectedGroup(group);
                  setAddMarketDialogOpen(true);
                }}
              >
                <AddIcon />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => handleDeleteGroup(group.id)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          
          {isExpanded && group.markets && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Markets in this group:
              </Typography>
              <List dense>
                {group.markets.map((groupMarket) => (
                  <ListItem key={groupMarket.id}>
                    <ListItemText
                      primary={groupMarket.market_title || groupMarket.market_id}
                      secondary={
                        <Stack direction="row" spacing={1}>
                          <Chip 
                            label={groupMarket.market_platform || 'Unknown'} 
                            size="small" 
                            variant="outlined"
                          />
                          <Typography variant="caption">
                            Weight: {groupMarket.weight} | Type: {groupMarket.position_type}
                          </Typography>
                          {groupMarket.market_current_price !== null && (
                            <Typography variant="caption" color="primary">
                              Price: ${groupMarket.market_current_price?.toFixed(2)}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={() => handleRemoveMarketFromGroup(group.id, groupMarket.market_id)}
                      >
                        <RemoveCircleIcon color="error" fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          SPMC Groups Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage market groups for testing SPMC API integration
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="All Groups" />
          <Tab label="Create Group" icon={<AddCircleIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Group
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadGroups}
          >
            Refresh
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" sx={{ mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {groups.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No groups found. Create your first group to get started.
                </Typography>
              </Paper>
            ) : (
              groups.map(renderGroupCard)
            )}
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Group Details Form */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Group Details
              </Typography>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Group Title"
                  value={newGroup.title}
                  onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
                  placeholder="e.g., My Watchlist"
                />
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Describe your group..."
                />
                <FormControl fullWidth>
                  <InputLabel>Group Type</InputLabel>
                  <Select
                    value={newGroup.group_type}
                    label="Group Type"
                    onChange={(e) => setNewGroup({ ...newGroup, group_type: e.target.value as any })}
                  >
                    <MenuItem value="watchlist">Watchlist</MenuItem>
                    <MenuItem value="portfolio">Portfolio</MenuItem>
                    <MenuItem value="index">Index</MenuItem>
                    <MenuItem value="arbitrage">Arbitrage</MenuItem>
                    <MenuItem value="correlated">Correlated</MenuItem>
                    <MenuItem value="inverse">Inverse</MenuItem>
                    <MenuItem value="same_event">Same Event</MenuItem>
                  </Select>
                </FormControl>
                
                <Divider />
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Markets: {createPanelSelectedMarkets.length}
                  </Typography>
                  {createPanelSelectedMarkets.length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                      {createPanelSelectedMarkets.slice(0, 5).map((m, idx) => (
                        <Chip 
                          key={m.market_id} 
                          label={`Market ${idx + 1}`}
                          size="small"
                          onDelete={() => {
                            setCreatePanelSelectedMarkets(
                              createPanelSelectedMarkets.filter(s => s.market_id !== m.market_id)
                            );
                          }}
                        />
                      ))}
                      {createPanelSelectedMarkets.length > 5 && (
                        <Chip 
                          label={`+${createPanelSelectedMarkets.length - 5} more`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  )}
                </Box>
                
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleCreateGroupWithMarkets}
                  disabled={!newGroup.title}
                  startIcon={<AddIcon />}
                >
                  Create Group
                </Button>
              </Stack>
            </Paper>
          </Grid>
          
          {/* Market Search and Selection */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Add Markets to Group
              </Typography>
              
              {/* Search Bar */}
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Search Markets"
                  value={createPanelSearchQuery}
                  onChange={(e) => setCreatePanelSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreatePanelSearch(0)}
                  placeholder="Search by market title..."
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() => handleCreatePanelSearch(0)}
                  disabled={createPanelSearchLoading || !createPanelSearchQuery.trim()}
                >
                  {createPanelSearchLoading ? <CircularProgress size={24} /> : 'Search'}
                </Button>
              </Stack>
              
              {/* Market Results */}
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {createPanelMarkets.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">
                      {createPanelSearchQuery ? 'No markets found. Try a different search.' : 'Search for markets to add to your group'}
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {createPanelMarkets.map((market) => {
                      const isSelected = createPanelSelectedMarkets.some(m => m.market_id === market.id);
                      return (
                        <ListItem
                          key={market.id}
                          sx={{ 
                            borderRadius: 1, 
                            mb: 1,
                            bgcolor: isSelected ? 'action.selected' : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setCreatePanelSelectedMarkets(
                                  createPanelSelectedMarkets.filter(m => m.market_id !== market.id)
                                );
                              } else {
                                setCreatePanelSelectedMarkets([...createPanelSelectedMarkets, {
                                  market_id: market.id,
                                  weight: 1,
                                  position_type: 'long'
                                }]);
                              }
                            }}
                          />
                          <ListItemText
                            primary={market.title}
                            secondary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip 
                                  label={market.platform} 
                                  size="small" 
                                  color={market.platform === 'polymarket' ? 'primary' : 
                                         market.platform === 'kalshi' ? 'secondary' : 'default'}
                                  variant="outlined"
                                />
                                {market.current_price !== undefined && (
                                  <Typography variant="caption" color="primary">
                                    ${market.current_price.toFixed(2)}
                                  </Typography>
                                )}
                                {market.volume_24h !== undefined && (
                                  <Typography variant="caption" color="text.secondary">
                                    Vol: ${(market.volume_24h / 1000).toFixed(0)}k
                                  </Typography>
                                )}
                                {market.category && (
                                  <Chip label={market.category} size="small" variant="outlined" />
                                )}
                              </Stack>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Box>
              
              {/* Pagination and Action Bar */}
              {createPanelMarkets.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  {/* Pagination */}
                  {createPanelTotalCount > pageSize && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      <Pagination
                        count={Math.ceil(createPanelTotalCount / pageSize)}
                        page={createPanelPage + 1}
                        onChange={(_, page) => handleCreatePanelSearch(page - 1)}
                        disabled={createPanelSearchLoading}
                        color="primary"
                        size="small"
                      />
                      <Typography variant="caption" sx={{ ml: 2, alignSelf: 'center' }} color="text.secondary">
                        Showing {createPanelPage * pageSize + 1}-{Math.min((createPanelPage + 1) * pageSize, createPanelTotalCount)} of {createPanelTotalCount} results
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Selection controls */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {createPanelSelectedMarkets.length} selected total
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        onClick={() => {
                          setCreatePanelSelectedMarkets(
                            createPanelMarkets.map(m => ({
                              market_id: m.id,
                              weight: 1,
                              position_type: 'long'
                            }))
                          );
                        }}
                      >
                        Select Page
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setCreatePanelSelectedMarkets([])}
                      >
                        Clear All
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Create Group Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={newGroup.title}
              onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Group Type</InputLabel>
              <Select
                value={newGroup.group_type}
                label="Group Type"
                onChange={(e) => setNewGroup({ ...newGroup, group_type: e.target.value as any })}
              >
                <MenuItem value="watchlist">Watchlist</MenuItem>
                <MenuItem value="portfolio">Portfolio</MenuItem>
                <MenuItem value="index">Index</MenuItem>
                <MenuItem value="arbitrage">Arbitrage</MenuItem>
                <MenuItem value="correlated">Correlated</MenuItem>
                <MenuItem value="inverse">Inverse</MenuItem>
                <MenuItem value="same_event">Same Event</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroup.title}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Market Dialog */}
      <Dialog 
        open={addMarketDialogOpen} 
        onClose={() => setAddMarketDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Add Markets to {selectedGroup?.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Search Markets"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchMarkets()}
              />
              <Button 
                variant="contained" 
                onClick={handleSearchMarkets}
                disabled={searchLoading}
                startIcon={searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              >
                Search
              </Button>
            </Stack>
            
            {searchMarkets.length > 0 && (
              <List>
                {searchMarkets.map((market) => {
                  const isSelected = selectedMarkets.some(m => m.market_id === market.id);
                  return (
                    <ListItem 
                      key={market.id}
                      button
                      onClick={() => {
                        if (isSelected) {
                          setSelectedMarkets(selectedMarkets.filter(m => m.market_id !== market.id));
                        } else {
                          setSelectedMarkets([...selectedMarkets, {
                            market_id: market.id,
                            weight: 1,
                            position_type: 'long'
                          }]);
                        }
                      }}
                      selected={isSelected}
                    >
                      <ListItemText
                        primary={market.title}
                        secondary={
                          <Stack direction="row" spacing={1}>
                            <Chip label={market.platform} size="small" />
                            <Typography variant="caption">
                              Vol: ${market.volume_24h?.toLocaleString() || 0}
                            </Typography>
                          </Stack>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Checkbox checked={isSelected} />
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddMarketDialogOpen(false);
            setSelectedMarkets([]);
            setSearchMarkets([]);
            setSearchQuery('');
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddMarketsToGroup}
            variant="contained"
            disabled={selectedMarkets.length === 0}
          >
            Add {selectedMarkets.length} Market{selectedMarkets.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}