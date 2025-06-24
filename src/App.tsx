import React, { useState } from 'react';
import { Box, Grid, CssBaseline } from '@mui/material';
import FolderPanel from './components/FolderPanel';
import DesignGrid from './components/DesignGrid';
import ActionToolbar from './components/ActionToolbar';

const App: React.FC = () => {
  const [selectedDesignId, setSelectedDesignId] = useState<string | undefined>();

  return (
    <Box sx={{ height: '100vh', width: '100vw', bgcolor: '#fafbfc' }}>
      <CssBaseline />
      <ActionToolbar />
      <Grid container sx={{ height: 'calc(100vh - 64px)' }}>
        <Grid item>
          <FolderPanel />
        </Grid>
        <Grid item xs>
          <DesignGrid
            selectedDesignId={selectedDesignId}
            onSelectDesign={setSelectedDesignId}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default App; 