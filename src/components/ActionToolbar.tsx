import React from 'react';
import { Box, Button } from '@mui/material';

const ActionToolbar: React.FC = () => (
  <Box display="flex" justifyContent="flex-end" alignItems="center" p={2} borderBottom="1px solid #eee">
    <Button variant="contained" color="primary" disabled>
      Move to Folder
    </Button>
  </Box>
);

export default ActionToolbar; 