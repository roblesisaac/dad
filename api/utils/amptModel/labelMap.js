export default function(schema) {
  for (const field in schema) { 
    if(!isLabel(field)) {
      continue;
    }


  }

  return {};
}

function isLabel(field) {
  const validLabels = Array.from({ length: 5 }, (_, i) => `label${i + 1}`);

  return validLabels.includes(field);
}