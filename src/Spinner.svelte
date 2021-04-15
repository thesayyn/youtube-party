<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <path
        d="M12 21a9 9 0 1 0-9-9"
        fill="none"
        stroke="#b0bec5"
        stroke-width="2"
        stroke-linecap="round"
    />
</svg>

<style>
    @keyframes fade {
        0% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
    }

    @keyframes rotate {
        0% {
            transform: translateZ(0) rotate(0deg);
        }
        100% {
            transform: translateZ(0) rotate(360deg);
        }
    }

    svg {
        opacity: 0;
        animation: fade 0.6s ease 1.5s, rotate 1s linear infinite;
        animation-fill-mode: forwards;
    }
</style>
