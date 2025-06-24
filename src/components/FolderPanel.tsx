import React from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';

const FolderPanel: React.FC = () => (
  <Box sx={{ width: 280, p: 2, borderRight: '1px solid #eee', height: '100vh', boxSizing: 'border-box' }}>
    <Typography variant="h6" mb={2}>Folders</Typography>
    <List>
      <ListItem disablePadding>
        <ListItemButton>
          <ListItemText primary="Folders not implemented" />
        </ListItemButton>
      </ListItem>
    </List>
  </Box>
);

export default FolderPanel; 