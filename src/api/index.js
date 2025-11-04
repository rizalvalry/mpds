/* === src/api/index.js === */
// Placeholder API wrapper; replace the URL and endpoints with your backend
export const uploadPhotos = async (formData) => {
    const res = await fetch('https://example.com/api/upload', {method: 'POST', body: formData});
    return res.json();
};