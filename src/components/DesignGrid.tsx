import React, { useEffect, useState } from 'react';
import { CanvaDesign } from '../types/canva';
import { listDesigns } from '../services/api';
import { Box, Grid, Card, CardActionArea, CardContent, Typography, Skeleton, Alert } from '@mui/material';

interface DesignGridProps {
  selectedDesignId?: string;
  onSelectDesign: (designId: string) => void;
}

const DesignGrid: React.FC<DesignGridProps> = ({ selectedDesignId, onSelectDesign }) => {
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listDesigns()
      .then(setDesigns)
      .catch(e => {
        if (e instanceof Error) setError(e.message);
        else setError('An unknown error occurred');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ flex: 1, p: 3, overflow: 'auto', height: 'calc(100vh - 64px)', boxSizing: 'border-box' }}>
      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item key={i} xs={12} sm={6} md={4} lg={3}>
              <Skeleton variant="rectangular" height={80} />
              <Skeleton width="60%" />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={2}>
          {designs.map((design) => (
            <Grid item key={design.id} xs={12} sm={6} md={4} lg={3}>
              <Card
                variant={selectedDesignId === design.id ? 'outlined' : undefined}
                sx={{ border: selectedDesignId === design.id ? '2px solid #1976d2' : undefined }}
              >
                <CardActionArea onClick={() => onSelectDesign(design.id)}>
                  <CardContent>
                    <Typography variant="subtitle1" noWrap>{design.title}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default DesignGrid; 