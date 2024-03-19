import React, { useState } from 'react'


const useAuth = () => {
    const getAuth = () => {
        //if (typeof window === "undefined") {
        //    return {'token': "", 'userid': ""};
	// }
        const tokenString = localStorage.getItem('token');
        const useridString = localStorage.getItem('userid');
        const userToken = JSON.parse(tokenString)
        const userid = JSON.parse(useridString)
        return { 'token': userToken, 'userid': userid }
    }

    const [auth, setAuth] = useState(getAuth())
    const saveToken = (userToken: string, userid: string) => {
        // if (typeof window === "undefined") {
        //      setAuth({token: "", userid: ""});
	// }
        localStorage.setItem('token', JSON.stringify(userToken))
        localStorage.setItem('userid', JSON.stringify(userid))
        setAuth({ token: userToken, userid: userid });
    }
    return {
        setAuth: saveToken,
        token: auth.token,
        userid: auth.userid
    }
}

export default useAuth
