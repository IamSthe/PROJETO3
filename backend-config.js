// Set the deployed backend HTTPS address here. Local server uses the same origin.
window.BLACKHEARTS_API_URL = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? location.origin : '';
