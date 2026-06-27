import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});


//outgoing request guard. (frontend -> backend )
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if(token)
            config.headers.Authorization = `Bearer ${token}`;

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


//incoming request from backend -> frontend.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if(error.response && error.response.status === 401){
            console.log("Token expired or unauthorized");
            // Yahan redirect mat karo, sirf logout function call karo ya kuch mat karo
            // Logout handle karne ke liye local storage clear karo
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
        return Promise.reject(error);
    }
);

export default api;
