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
  Tooltip
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
          <Tab label="API Testing" />
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
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            API Testing Panel
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Test SPMC Group API endpoints directly
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Stack spacing={2}>
                    <Button 
                      fullWidth 
                      variant="outlined"
                      onClick={async () => {
                        const title = prompt('Enter group title:');
                        if (title) {
                          try {
                            const response = await spmcClient.createGroup({
                              title,
                              description: 'Test group created via API',
                              group_type: 'watchlist',
                              metadata: { test: true }
                            });
                            console.log('Create group response:', response);
                            alert(`Group created: ${JSON.stringify(response.data, null, 2)}`);
                            loadGroups();
                          } catch (err) {
                            console.error('Error:', err);
                            alert(`Error: ${err}`);
                          }
                        }
                      }}
                    >
                      Test Create Group
                    </Button>
                    
                    <Button 
                      fullWidth 
                      variant="outlined"
                      onClick={async () => {
                        try {
                          const response = await spmcClient.listGroups({ limit: 5 });
                          console.log('List groups response:', response);
                          alert(`Groups: ${JSON.stringify(response.data, null, 2)}`);
                        } catch (err) {
                          console.error('Error:', err);
                          alert(`Error: ${err}`);
                        }
                      }}
                    >
                      Test List Groups (limit 5)
                    </Button>
                    
                    <Button 
                      fullWidth 
                      variant="outlined"
                      onClick={async () => {
                        const groupId = prompt('Enter group ID:');
                        if (groupId) {
                          try {
                            const response = await spmcClient.getGroup(groupId);
                            console.log('Get group response:', response);
                            alert(`Group details: ${JSON.stringify(response.data, null, 2)}`);
                          } catch (err) {
                            console.error('Error:', err);
                            alert(`Error: ${err}`);
                          }
                        }
                      }}
                    >
                      Test Get Group Details
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Console Output
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open browser console to see API responses
                  </Typography>
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="caption" component="pre">
                      Press F12 to open DevTools
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
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