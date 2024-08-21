import { ThemeOptions, ThemeProvider, createTheme } from '@mui/material/styles';

export const themeOptions: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: {
            main: '#003c6c',
            contrastText: '#fffce6',
        },
        secondary: {
            main: '#fdc700',
        },
    },
    typography: {
        fontFamily: 'Roboto',
    },
    components: {
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    "&.Mui-selected": {
                        backgroundColor: "#00000030",
                    }
                }
            }
        }
    }
};
export const theme = createTheme(themeOptions);
