import React, { useState } from 'react';
import { 
  Tabs, 
  Tab, 
  Box, 
  Tooltip, 
  IconButton, 
  TextField,
  Typography,
  Paper
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

/**
 * Componente TabWithInput
 * Demonstra guias (Tabs) posicionadas diretamente acima de um campo de entrada
 * com um ícone de ajuda (Tooltip) informativo.
 */
const TabWithInput: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState(['Geral', 'Detalhes']);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const addNewTab = () => {
    const newTabName = `Aba ${tabs.length + 1}`;
    setTabs([...tabs, newTabName]);
    setActiveTab(tabs.length);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 500, p: 3, mx: 'auto' }}>
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
        {/* Container das Tabs e Tooltip usando Flexbox para alinhamento */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: 1, 
            borderColor: 'divider',
            mb: 2 
          }}
        >
          {/* Componente de Tabs do MUI */}
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="guias de informação do campo"
          >
            {tabs.map((label, index) => (
              <Tab 
                key={index} 
                label={label} 
                id={`tab-${index}`}
                aria-controls={`tabpanel-${index}`}
                sx={{ minWidth: 100, textTransform: 'none' }}
              />
            ))}
          </Tabs>

          {/* Ícone de interrogação com Tooltip */}
          <Tooltip title="Informações sobre a aba" arrow placement="top">
            <IconButton 
              size="small" 
              sx={{ ml: 1, color: 'text.secondary' }}
              aria-label="ajuda sobre a aba"
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Área de conteúdo e campo de entrada */}
        <Box 
          role="tabpanel" 
          id={`tabpanel-${activeTab}`} 
          aria-labelledby={`tab-${activeTab}`}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Editando: {tabs[activeTab]}
          </Typography>
          
          <TextField
            fullWidth
            label="Conteúdo da Aba"
            variant="outlined"
            placeholder="Digite algo aqui..."
            sx={{ mt: 1 }}
          />

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                cursor: 'pointer', 
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={addNewTab}
            >
              + Adicionar nova aba
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default TabWithInput;
