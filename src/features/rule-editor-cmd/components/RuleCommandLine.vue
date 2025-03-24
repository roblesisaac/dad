<template>
  <div class="rule-line group" :class="{ 'editing': isEditing }">
    <div v-if="!isEditing" class="flex items-center flex-grow">
      <span class="rule-text" @click="startEditing">
        <span :class="`text-${getRuleColor}-500 font-bold`">{{ rule.type }}</span>
        <template v-if="rule.type === 'categorize'">
          <span class="text-gray-400"> AS </span>
          <span class="text-yellow-300">{{ rule.category }}</span>
        </template>
        <span class="text-gray-400"> WHEN </span>
        <span class="text-blue-400">{{ rule.property }}</span>
        <span class="text-green-400"> {{ rule.method }} </span>
        <span class="text-orange-300">"{{ rule.criterion }}"</span>
        <span class="text-gray-400"> FOR </span>
        <span class="text-purple-400">{{ rule.tabs }}</span>
        <span class="text-gray-400"> tabs</span>
      </span>
      
      <!-- Action buttons shown on hover -->
      <div class="ml-auto actions opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          @click.stop="startEditing" 
          class="p-1 text-gray-400 hover:text-white rounded"
          title="Edit rule"
        >
          <Edit class="w-4 h-4" />
        </button>
        <button 
          @click.stop="confirmDeleteRule" 
          class="p-1 text-gray-400 hover:text-red-500 rounded ml-1"
          title="Delete rule"
        >
          <Trash class="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <div v-else class="flex items-center w-full">
      <div class="flex-grow relative">
        <div class="flex items-start bg-gray-800 rounded px-3 py-2">
          <span class="text-green-400 mr-2 font-mono">$</span>
          <div class="w-full relative font-mono">
            <!-- Colored display that shows formatted text -->
            <div v-html="coloredEditCommand" class="whitespace-pre-wrap break-words"></div>
            <!-- Real input field (invisible) -->
            <input
              ref="editInputRef"
              v-model="editCommand"
              @keydown="handleKeydown"
              class="absolute inset-0 w-full h-full bg-transparent opacity-0 cursor-text font-mono focus:outline-none"
              spellcheck="false"
            />
          </div>
        </div>
        
        <div 
          v-if="suggestions.length > 0" 
          class="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 max-h-48 overflow-y-auto"
        >
          <div 
            v-for="(suggestion, index) in suggestions" 
            :key="index"
            @click="selectSuggestion(suggestion)"
            class="px-3 py-2 hover:bg-gray-700 cursor-pointer"
            :class="{ 'bg-gray-700': index === selectedSuggestionIndex }"
          >
            {{ suggestion }}
          </div>
        </div>
      </div>
      
      <div class="ml-2 flex space-x-1">
        <button 
          @click="saveEdit"
          class="p-1 bg-green-600 hover:bg-green-700 rounded text-white"
          title="Save changes"
        >
          <Check class="w-4 h-4" />
        </button>
        <button 
          @click="cancelEdit"
          class="p-1 bg-red-600 hover:bg-red-700 rounded text-white"
          title="Cancel edit"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { 
  SortAsc, FolderCheck, Filter, Group, Check, X, Edit, Trash
} from 'lucide-vue-next';
import { useRuleParser } from '../composables/useRuleParser.js';
import { useRuleManager } from '@/features/rule-manager/composables/useRuleManager.js';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState.js';

const props = defineProps({
  rule: {
    type: Object,
    required: true
  },
  originalRule: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update', 'delete']);

const { state } = useDashboardState();
const { parseCommandToRule, parseRuleToCommand } = useRuleParser();
const { updateRule, deleteRuleById } = useRuleManager();

// Editing state
const isEditing = ref(false);
const editInputRef = ref(null);
const editCommand = ref('');
const selectedSuggestionIndex = ref(0);
const cursorPosition = ref(0);

// Get the appropriate color based on rule type
const getRuleColor = computed(() => {
  switch (props.rule.type) {
    case 'categorize': return 'teal';
    case 'sort': return 'cyan';
    case 'filter': return 'amber';
    case 'groupBy': return 'indigo';
    default: return 'blue';
  }
});

// Format the rule to a command string
function formatRuleToCommandString() {
  let cmd = props.rule.type;
  
  if (props.rule.type === 'categorize') {
    cmd += ` AS ${props.rule.category}`;
  }
  
  cmd += ` WHEN ${props.rule.property} ${props.rule.method} "${props.rule.criterion}" FOR ${props.rule.tabs} tabs`;
  
  return cmd;
}

// Start editing the rule
function startEditing() {
  isEditing.value = true;
  editCommand.value = formatRuleToCommandString();
  
  nextTick(() => {
    if (editInputRef.value) {
      editInputRef.value.focus();
      // Position cursor at the end
      editInputRef.value.selectionStart = editCommand.value.length;
      editInputRef.value.selectionEnd = editCommand.value.length;
    }
  });
}

// Cancel editing
function cancelEdit() {
  isEditing.value = false;
}

// Save the edited rule
async function saveEdit() {
  try {
    // Parse the command string to rule object
    const commandParts = parseCommandString(editCommand.value);
    const updatedRule = parseCommandToRule(commandParts, props.originalRule);
    
    // Update the rule in the database
    await updateRule(updatedRule);
    emit('update', updatedRule);
    
    // Exit edit mode
    isEditing.value = false;
  } catch (error) {
    console.error('Error updating rule:', error);
  }
}

// Parse the command string into command parts object
function parseCommandString(commandStr) {
  const parts = {
    type: '',
    category: '',
    property: '',
    method: '',
    criterion: '',
    tabs: '_GLOBAL'
  };
  
  // Basic parsing logic - can be improved for more complex cases
  const typeMatch = commandStr.match(/^(\w+)/);
  if (typeMatch) parts.type = typeMatch[1];
  
  if (parts.type === 'categorize') {
    const categoryMatch = commandStr.match(/AS ([^W]+?) WHEN/i);
    if (categoryMatch) parts.category = categoryMatch[1].trim();
  }
  
  const propertyMatch = commandStr.match(/WHEN ([^ ]+) /i);
  if (propertyMatch) parts.property = propertyMatch[1];
  
  // For method, we need to handle different formats
  const methodRegex = parts.type === 'sort' 
    ? /WHEN [^ ]+ (asc|desc)/i 
    : /WHEN [^ ]+ ([\w><=]+) /i;
  
  const methodMatch = commandStr.match(methodRegex);
  if (methodMatch) parts.method = methodMatch[1];
  
  // Match criterion between quotes
  const criterionMatch = commandStr.match(/"([^"]+)"/);
  if (criterionMatch) parts.criterion = criterionMatch[1];
  
  // Match tabs
  const tabsMatch = commandStr.match(/FOR ([^t]+) tabs/i);
  if (tabsMatch) parts.tabs = tabsMatch[1].trim();
  
  return parts;
}

// Handle keyboard events
function handleKeydown(event) {
  if (event.key === 'Escape') {
    cancelEdit();
  } else if (event.key === 'Enter') {
    saveEdit();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (selectedSuggestionIndex.value < suggestions.value.length - 1) {
      selectedSuggestionIndex.value++;
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (selectedSuggestionIndex.value > 0) {
      selectedSuggestionIndex.value--;
    }
  } else if (event.key === 'Tab') {
    if (suggestions.value.length > 0) {
      event.preventDefault();
      // Always select the highlighted suggestion (or first if none highlighted)
      const indexToSelect = selectedSuggestionIndex.value >= 0 ? selectedSuggestionIndex.value : 0;
      selectSuggestion(suggestions.value[indexToSelect]);
    } else {
      event.preventDefault();
      autoInsertFillerWords();
    }
  } else if (event.key === ' ') {
    // Check if we should auto-insert filler words after space
    nextTick(() => {
      if (editInputRef.value) {
        cursorPosition.value = editInputRef.value.selectionStart;
      }
      autoInsertFillerWords();
    });
  } else {
    // Update cursor position for all other keys
    nextTick(() => {
      if (editInputRef.value) {
        cursorPosition.value = editInputRef.value.selectionStart;
      }
    });
  }
}

// Get text width for cursor positioning
function getTextWidth(text) {
  // Create a temporary span to measure text width
  const span = document.createElement('span');
  span.style.visibility = 'hidden';
  span.style.position = 'absolute';
  span.style.fontFamily = 'Consolas, Monaco, Source Code Pro, monospace';
  span.style.fontSize = '0.9rem';
  span.style.whiteSpace = 'pre';
  span.innerText = text || '';
  document.body.appendChild(span);
  const width = span.offsetWidth;
  document.body.removeChild(span);
  return width;
}

// Auto-insert filler words based on current command
function autoInsertFillerWords() {
  if (!editInputRef.value) return;
  
  const currentText = editCommand.value;
  const cursorPos = editInputRef.value.selectionStart;
  
  // Get the word before the cursor
  const textBeforeCursor = currentText.substring(0, cursorPos);
  const textAfterCursor = currentText.substring(cursorPos);
  const words = textBeforeCursor.split(' ');
  const lastWord = words[words.length - 1].toLowerCase();
  const commandParts = textBeforeCursor.match(/^(\w+)/i);
  const commandType = commandParts ? commandParts[1].toLowerCase() : '';
  
  let insertion = '';
  let insertPosition = cursorPos;
  
  // Handle categorize command
  if (lastWord === 'categorize' && !textBeforeCursor.includes(' AS ') && 
      !textBeforeCursor.endsWith(' AS') && 
      !textAfterCursor.startsWith(' AS')) {
    insertion = ' AS ';
  } 
  // Add "WHEN" after category name in categorize command
  else if (commandType === 'categorize' && textBeforeCursor.includes(' AS ') && 
           !textBeforeCursor.includes(' WHEN ') && 
           !textBeforeCursor.endsWith(' WHEN') && 
           !textAfterCursor.startsWith(' WHEN') &&
           words.length >= 3) {
    insertion = ' WHEN ';
  }
  // Handle sort command
  else if (lastWord === 'sort' && 
           !textBeforeCursor.includes(' BY ') && 
           !textBeforeCursor.endsWith(' BY') && 
           !textAfterCursor.startsWith(' BY')) {
    insertion = ' BY ';
  }
  // Add property for sort command
  else if (commandType === 'sort' && textBeforeCursor.includes(' BY ') && 
           !textBeforeCursor.includes(' IN ') && 
           !textBeforeCursor.endsWith(' IN') && 
           !textAfterCursor.startsWith(' IN') &&
           words.length >= 3) {
    insertion = ' IN ';
  }
  // Add sort direction after IN
  else if (commandType === 'sort' && textBeforeCursor.includes(' IN ') && 
           !textBeforeCursor.match(/ (ASC|DESC)/) && 
           !textAfterCursor.match(/^(ASC|DESC)/) &&
           words.length >= 5) {
    insertion = ' ASC';
  }
  // Handle groupBy command
  else if (lastWord === 'groupby' && 
           !textBeforeCursor.includes(' ') && 
           words.length === 1) {
    insertion = ' ';
  }
  // Handle filter command
  else if (lastWord === 'filter' && 
           !textBeforeCursor.includes(' WHEN ') && 
           !textBeforeCursor.endsWith(' WHEN') && 
           !textAfterCursor.startsWith(' WHEN')) {
    insertion = ' WHEN ';
  }
  // Add property and method for filter command
  else if (commandType === 'filter' && textBeforeCursor.includes(' WHEN ') && 
           !textBeforeCursor.match(/ WHEN .+? (IS|>=|<=|>|<|=|contains|includes|excludes|equals|startsWith|endsWith)/) && 
           words.length >= 3 &&
           ['name', 'amount', 'date', 'category'].includes(words[words.length - 1]?.toLowerCase()) &&
           !textAfterCursor.match(/^(IS|>=|<=|>|<|=|contains|includes|excludes|equals|startsWith|endsWith)/)) {
    insertion = ' IS ';
  }
  // Add quotes after method for filter (if needed)
  else if (commandType === 'filter' && 
          textBeforeCursor.match(/ WHEN .+? (equals|contains|includes|excludes|startsWith|endsWith)\s*$/i) &&
          !textAfterCursor.startsWith(' "') &&
          !textAfterCursor.startsWith('"')) {
    insertion = ' "';
  }
  // Add appropriate text after property for other command types
  else if (textBeforeCursor.includes(' WHEN ') && 
          !textBeforeCursor.match(/ WHEN .+? (asc|desc|equals|contains|includes|excludes|startsWith|endsWith|IS|>|<|>=|<=|=|is not)/i) && 
          words.length >= 5 &&
          ['name', 'amount', 'date', 'category'].includes(words[words.length - 1]?.toLowerCase()) &&
          !textAfterCursor.match(/^(asc|desc|equals|contains|includes|excludes|startsWith|endsWith|IS|>|<|>=|<=|=|is not)/i)) {
    if (commandType === 'sort') {
      insertion = ' asc ';
    } else {
      insertion = ' includes ';
    }
  }
  // Add "FOR" after criterion or after the last parameter
  else if ((textBeforeCursor.includes('"') && textBeforeCursor.split('"').length > 2) || 
           (commandType === 'sort' && textBeforeCursor.match(/(ASC|DESC)$/i)) ||
           (commandType === 'groupby' && words.length >= 2)) {
    if (!textBeforeCursor.includes(' FOR ') &&
        !textBeforeCursor.endsWith(' FOR') &&
        !textAfterCursor.startsWith(' FOR') &&
        !textAfterCursor.startsWith('FOR')) {
      insertion = ' FOR ';
    }
  }
  // Add "tabs" after tab names
  else if (textBeforeCursor.includes(' FOR ') && 
           !textBeforeCursor.toLowerCase().includes(' tabs') &&
           !textBeforeCursor.toLowerCase().endsWith(' tabs') &&
           !textAfterCursor.toLowerCase().startsWith(' tabs') &&
           !textAfterCursor.toLowerCase().startsWith('tabs')) {
    insertion = ' tabs';
  }
  
  if (insertion) {
    const newText = textBeforeCursor + insertion + textAfterCursor;
    editCommand.value = newText;
    nextTick(() => {
      if (editInputRef.value) {
        editInputRef.value.selectionStart = insertPosition + insertion.length;
        editInputRef.value.selectionEnd = insertPosition + insertion.length;
        cursorPosition.value = insertPosition + insertion.length;
      }
    });
  }
}

// Autocomplete suggestions
const suggestions = computed(() => {
  if (!editInputRef.value) return [];
  
  const currentText = editCommand.value;
  const cursorPos = cursorPosition.value;
  const textBeforeCursor = currentText.substring(0, cursorPos);
  const words = textBeforeCursor.split(' ');
  const lastWord = words[words.length - 1].toLowerCase();
  
  // Command type suggestions at beginning
  if (words.length === 1 && lastWord) {
    return ['categorize', 'sort', 'filter', 'groupBy'].filter(
      type => type.toLowerCase().startsWith(lastWord)
    );
  }
  
  // Property suggestions after WHEN
  if (textBeforeCursor.includes(' WHEN ') && 
      words[words.length - 2]?.toLowerCase() === 'when') {
    return ['name', 'amount', 'date', 'category'].filter(
      prop => prop.toLowerCase().startsWith(lastWord)
    );
  }
  
  // Method suggestions after property
  const commandParts = currentText.match(/^(\w+)/i);
  const commandType = commandParts ? commandParts[1].toLowerCase() : '';
  
  if (textBeforeCursor.includes(' WHEN ') && 
      ['name', 'amount', 'date', 'category'].includes(words[words.length - 2]?.toLowerCase())) {
    
    if (commandType === 'sort') {
      return ['asc', 'desc'].filter(
        method => method.startsWith(lastWord)
      );
    } else {
      return ['equals', 'contains', 'startsWith', 'endsWith', 'includes', 'excludes', 'is', '>', '<', '>=', '<='].filter(
        method => method.toLowerCase().startsWith(lastWord)
      );
    }
  }
  
  // Tab suggestions after FOR
  if (textBeforeCursor.includes(' FOR ') && 
      words[words.length - 2]?.toLowerCase() === 'for') {
    const tabSuggestions = ['_GLOBAL', ...state.allUserTabs.map(tab => tab.tabName)];
    return tabSuggestions.filter(
      tab => tab.toLowerCase().includes(lastWord)
    );
  }
  
  return [];
});

// Select a suggestion
function selectSuggestion(suggestion) {
  if (!editInputRef.value) return;
  
  const currentText = editCommand.value;
  const cursorPos = editInputRef.value.selectionStart;
  const textBeforeCursor = currentText.substring(0, cursorPos);
  const textAfterCursor = currentText.substring(cursorPos);
  
  const words = textBeforeCursor.split(' ');
  const lastWordStart = textBeforeCursor.lastIndexOf(' ') + 1;
  
  // Replace the last word with the suggestion
  const newText = textBeforeCursor.substring(0, lastWordStart) + suggestion + textAfterCursor;
  editCommand.value = newText;
  
  // Auto-insert filler words based on the suggestion
  nextTick(() => {
    if (editInputRef.value) {
      const newCursorPos = lastWordStart + suggestion.length;
      editInputRef.value.selectionStart = newCursorPos;
      editInputRef.value.selectionEnd = newCursorPos;
      autoInsertFillerWords();
    }
  });
}

// Delete rule confirmation
function confirmDeleteRule() {
  if (confirm('Are you sure you want to delete this rule?')) {
    emit('delete', props.originalRule._id);
  }
}

// Get colored text with syntax highlighting
const coloredEditCommand = computed(() => {
  const words = editCommand.value.split(' ');
  if (words.length === 0) return '';
  
  let result = '';
  let isInCategory = false;
  let isInProperty = false;
  let isInMethod = false;
  let isInCriterion = false;
  let isInTabs = false;
  let openQuote = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (i === 0) {
      // First word is the type
      result += `<span class="text-${getRuleColor.value}-500 font-bold">${word}</span>`;
    } else if (word.toUpperCase() === 'AS' && !isInCategory) {
      result += ` <span class="text-gray-400">${word}</span>`;
      isInCategory = true;
    } else if (word.toUpperCase() === 'WHEN' && !isInProperty) {
      result += ` <span class="text-gray-400">${word}</span>`;
      isInCategory = false;
      isInProperty = true;
    } else if (word.includes('"') && !openQuote) {
      // Start of criterion
      openQuote = true;
      const parts = word.split('"');
      if (parts[0]) {
        result += ` <span class="text-green-400">${parts[0]}</span>`;
      }
      result += ` <span class="text-orange-300">"${parts[1]}</span>`;
    } else if (word.includes('"') && openQuote) {
      // End of criterion
      openQuote = false;
      const parts = word.split('"');
      result += `<span class="text-orange-300">${parts[0]}"</span>`;
      if (parts[1]) {
        result += ` ${parts[1]}`;
      }
      isInCriterion = false;
    } else if (openQuote) {
      // Inside criterion
      result += ` <span class="text-orange-300">${word}</span>`;
    } else if (word.toUpperCase() === 'FOR' && !isInTabs) {
      result += ` <span class="text-gray-400">${word}</span>`;
      isInTabs = true;
    } else if (word.toLowerCase() === 'tabs' && isInTabs) {
      result += ` <span class="text-gray-400">${word}</span>`;
    } else if (isInCategory) {
      result += ` <span class="text-yellow-300">${word}</span>`;
    } else if (isInProperty) {
      result += ` <span class="text-blue-400">${word}</span>`;
      isInProperty = false;
      isInMethod = true;
    } else if (isInMethod) {
      result += ` <span class="text-green-400">${word}</span>`;
      isInMethod = false;
      isInCriterion = true;
    } else if (isInTabs) {
      result += ` <span class="text-purple-400">${word}</span>`;
    } else {
      result += ` ${word}`;
    }
  }
  
  return result;
});
</script>

<style scoped>
.rule-line {
  padding: 0.5rem;
  border-radius: 0.25rem;
  background-color: #1a1a1a;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  line-height: 1.5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rule-line:hover {
  background-color: #2a2a2a;
}

.rule-line.editing {
  background-color: #252525;
  border: 1px solid #3a3a3a;
}

.rule-text {
  font-family: 'Consolas', 'Monaco', 'Source Code Pro', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.rule-colored-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  font-family: 'Consolas', 'Monaco', 'Source Code Pro', monospace;
}

.rule-line .actions {
  display: none;
}

.rule-line:hover .actions {
  display: flex;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-blink {
  animation: blink 1s step-end infinite;
}
</style> 