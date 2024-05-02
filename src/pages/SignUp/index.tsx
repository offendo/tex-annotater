import * as React from 'react';
import { useNavigate } from "react-router-dom";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Link as RouterLink } from 'react-router-dom';
import useAuth from "@/lib/Token";

type SignUpFormProps = {

}

const SignUpForm = (props: SignUpFormProps) => {
    const [passwordsMatch, setPasswordsMatch] = React.useState(true);
    const [message, setMessage] = React.useState("");
    const [code, setCode] = React.useState(0);
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
            confirmpassword: data.get('confirmpassword'),
        };
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', mode: 'cors' },
            body: JSON.stringify(body)
        };
        if (body.password == body.confirmpassword) {
            setPasswordsMatch(true);
            const response = await fetch('/api/user', requestOptions);
            const res = await response.json();
            setMessage(res?.error || "Success!");
            setCode(response.status)
            if (response.status == 200) {
                setAuth(res['token'], res['userid']);
                navigate(`/`)
            }
        } else {
            setPasswordsMatch(false);
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
                    Create account
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
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
                                error={!passwordsMatch}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="confirmpassword"
                                label="Confirm Password"
                                type="password"
                                id="confirmpassword"
                                autoComplete="new-password"
                                error={!passwordsMatch}
                                helperText={!passwordsMatch ? "Passwords must match" : ""}
                            />
                        </Grid>
                    </Grid>
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Create account
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid item>
                            <Link component={RouterLink} to="/signin"> Click here to login </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            <Snackbar open={message != ""} autoHideDuration={4000} onClose={handleAlertClose}>
                <Alert
                    onClose={handleAlertClose}
                    severity={code == 200 ? "success" : "error"}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </Container>

    );
}
export default SignUpForm;
