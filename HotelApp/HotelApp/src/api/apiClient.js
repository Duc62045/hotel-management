import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

function getDevMachineHost() {
    const scriptUrl = NativeModules?.SourceCode?.scriptURL;
    if (!scriptUrl || typeof scriptUrl !== 'string') return null;

    const match = scriptUrl.match(/^https?:\/\/([^/:]+)/i);
    return match?.[1] || null;
}

function normalizeUrl(url) {
    if (!url) return null;
    return String(url).trim().replace(/\/+$/, '');
}

const devHost = getDevMachineHost();

const CANDIDATE_BASE_URLS = [
    devHost ? `http://${devHost}:8000` : null,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://192.168.100.156:8000', // ← IP thật của máy tính (Wi-Fi hiện tại)
]
    .map(normalizeUrl)
    .filter(Boolean)
    .filter((url, index, arr) => arr.indexOf(url) === index);

let baseUrlIndex = 0;

const apiClient = axios.create({
    baseURL: CANDIDATE_BASE_URLS[baseUrlIndex],
    timeout: 15000,
});

// Tự động gắn JWT token vào header của mọi request
apiClient.interceptors.request.use(async (config) => {
    config.baseURL = CANDIDATE_BASE_URLS[baseUrlIndex];
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config || {};
        const retryCount = originalRequest._baseUrlRetryCount || 0;
        const canRetryAnotherBaseUrl =
            !error.response &&
            retryCount < CANDIDATE_BASE_URLS.length - 1;

        if (canRetryAnotherBaseUrl) {
            baseUrlIndex += 1;
            originalRequest._baseUrlRetryCount = retryCount + 1;
            originalRequest.baseURL = CANDIDATE_BASE_URLS[baseUrlIndex];
            return apiClient(originalRequest);
        }

        return Promise.reject(error);
    }
);

export default apiClient;