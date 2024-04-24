import React, { useState } from 'react'

const defaultPatterns = [
    String.raw`an\? \([^ ]* \)*is an\? `,
    String.raw`an\? \([^ ]* \)*is an\? \([^ ]* \)*if`,
    String.raw`the \([^ ]* \)*is an\? `,
    String.raw`the \([^ ]* \)*is the `,
    String.raw`is called \([^ ]* \)*if`,
    String.raw`is called \([^ ]* \)*when`,
    String.raw`is called an\? \([^ ]* \)*`,
    String.raw`we call \([^ ]* \)*if`,
    String.raw`we call \([^ ]* \)*the \([^ ]* \)if`,
    String.raw`we call \([^ ]* \)*the \([^ ]* \)when`,
    String.raw`we call \([^ ]* \)*an\? \([^ ]* \)if`,
    String.raw`we define \([^ ]* \)*to be`,
]

const usePatterns = () => {
    const getPatterns = () => {
        const regexPatterns = localStorage.getItem('patterns') || '{"patterns": [], "selectedPatterns": []}';
        const parsed = JSON.parse(regexPatterns);

        // use default patterns if we don't have any in the storage
        if (parsed.patterns.length == 0){
            parsed.patterns = defaultPatterns;
            parsed.selectedPatterns = defaultPatterns;
        }
        return parsed;
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
