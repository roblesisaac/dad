export default function proper(str) {
    if (!str) return '';
  
    return str.toLowerCase().replace(/\b(\w)/g, function(firstLetter) {
        return firstLetter.toUpperCase();
    });
}