import * as React from 'react';
import { useNavigate } from "react-router-dom";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import useAuth from '../Token';

const SignInForm = () => {

    const [message, setMessage] = React.useState("");
    const [success, setSuccess] = React.useState(false);
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    const handleAlertClose = (e) => {
        setMessage("");
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const body = {
            userid: data.get('userid'),
            password: data.get('password'),
        };
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        const response = await fetch('http://localhost:5000/authenticate', requestOptions);
        const res = await response.json();
        if (res['authenticated']) {
            setSuccess(res['authenticated'])
            setAuth(res['token'], res['userid']);
            navigate(`/`)
        } else {
            setMessage("Invalid user/password combination")
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Sign In
                </Typography>
                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="userid"
                                label="User ID"
                                name="userid"
                                autoComplete="username"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="new-password"
                            />
                        </Grid>
                    </Grid>
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Sign In
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link component={RouterLink} to="/signup"> Sign up here </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            <Snackbar open={message != ""} autoHideDuration={4000} onClose={handleAlertClose}>
                <Alert
                    onClose={handleAlertClose}
                    severity={success ? "success" : "error"}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
export default SignInForm;
