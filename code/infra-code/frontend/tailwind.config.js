module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    darkMode: "class",
    theme: {
        extend: {},
    },
    plugins: [],
    extend: {
        keyframes: {
            "slide-in": {
                "0%": { transform: "translateX(100%)", opacity: 0},
                "100%": { transform: "translateX(0)", opacity: 1},
            },
        },
        animation: {
            "slide-in": "slide-in 0.4s ease-out",
        },
    },
};