import React, { useState } from 'react'


const usePatterns = () => {
    const getPatterns = () => {
        const regexPatterns = localStorage.getItem('patterns') || '{"patterns": [], "selectedPatterns": []}';
        console.log('patterns: ', regexPatterns, typeof regexPatterns);
        return JSON.parse(regexPatterns)
    }

    const [state, setState] = useState<any>(getPatterns())
    const savePatterns = (regexPatterns: any) => {
        localStorage.setItem('patterns', JSON.stringify(regexPatterns));
        setState(regexPatterns);
    }
    return {
        regexPatterns: state,
        setRegexPatterns: savePatterns,
    }
}

export default usePatterns;
