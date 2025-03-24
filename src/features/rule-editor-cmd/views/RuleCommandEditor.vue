<template>
  <div class="text-white h-full rounded-md flex flex-col">
    <!-- Command editor header -->
    <div class="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
      <h2 class="text-xl font-mono">Rule Command Editor</h2>
      <div class="text-sm text-gray-400">
        <span>Click on any rule to edit or use the input box below to create a new rule</span>
      </div>
    </div>
    
    <!-- Command editor content -->
    <div class="flex-grow overflow-auto p-4 bg-gray-900">
      <!-- Existing rules display -->
      <div class="mb-4 font-mono">
        <div v-for="(rule, index) in formattedRules" :key="index" class="mb-3">
          <RuleCommandLine 
            :rule="rule" 
            :original-rule="getOriginalRule(index)"
            @update="updateExistingRule"
            @delete="deleteRule"
          />
        </div>
      </div>
      
      <!-- New rule input area -->
      <div class="rule-new-input border-t border-gray-700 pt-4">
        <!-- Empty input for starting a new rule -->
        <div class="flex items-center mb-2">
          <div class="flex-grow relative">
            <div class="flex items-center bg-gray-800 rounded px-3 py-2">
              <span class="text-green-400 mr-2 font-mono">$</span>
              <div class="w-full relative font-mono">
                <!-- Colored display that shows formatted text -->
                <div v-html="newRuleColoredCommand" class="whitespace-pre-wrap break-words"></div>
                <!-- Real input field (invisible) -->
                <input
                  ref="newRuleInputRef"
                  v-model="newRuleCommand"
                  @keydown="handleNewRuleKeydown"
                  class="absolute inset-0 w-full h-full bg-transparent opacity-0 cursor-text font-mono focus:outline-none"
                  placeholder="Type to create a new rule (e.g. categorize AS Groceries WHEN ...)"
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
          
          <button 
            @click="createNewRule"
            class="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            :disabled="!canCreateRule"
          >
            Create
          </button>
        </div>
        
        <!-- Command helper text -->
        <div class="text-xs text-gray-500 mt-2 ml-1">
          <p>Format: <span class="text-gray-300">[type] AS [category] WHEN [property] [method] "[criterion]" FOR [tabs] tabs</span></p>
          <p class="mt-1">Example: <span class="text-gray-300">categorize AS FastFood WHEN name includes "McDonald,KFC" FOR _GLOBAL tabs</span></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useRuleFormatter } from '../composables/useRuleFormatter.js';
import { useRuleParser } from '../composables/useRuleParser.js';
import { useRuleManager } from '@/features/rule-manager/composables/useRuleManager.js';
import {
  SortAsc, FolderCheck, Filter, Group
} from 'lucide-vue-next';

import RuleCommandLine from '../components/RuleCommandLine.vue';

const { state } = useDashboardState();
const { formatRulesToCommandLines } = useRuleFormatter();
const { parseCommandToRule, parseRuleToCommand } = useRuleParser();
const { createRule, updateRule, deleteRuleById } = useRuleManager();

// Emit events
const emit = defineEmits(['close']);

// Refs for the new rule input
const newRuleInputRef = ref(null);
const newRuleCommand = ref('');
const selectedSuggestionIndex = ref(0);
const cursorPosition = ref(0);

// Computed properties
const formattedRules = computed(() => {
  return formatRulesToCommandLines(state.allUserRules);
});

// Get original rule by index
function getOriginalRule(index) {
  return state.allUserRules[index];
}

// Suggestions for autocomplete
const suggestions = computed(() => {
  // Simple implementation - can be improved with more context-awareness
  const input = newRuleCommand.value.toLowerCase();
  if (!input) return [];
  
  const words = input.split(' ');
  const lastWord = words[words.length - 1];
  
  // Type suggestions at the beginning
  if (words.length === 1) {
    return ['categorize', 'sort', 'filter', 'groupBy'].filter(
      type => type.startsWith(lastWord)
    );
  }
  
  // Property suggestions after WHEN
  if (words.includes('when') && words.indexOf('when') === words.length - 2) {
    return ['name', 'amount', 'date', 'category'].filter(
      prop => prop.startsWith(lastWord)
    );
  }
  
  // Method suggestions
  if (words.includes('name') && words.indexOf('name') === words.length - 2) {
    return ['equals', 'contains', 'startsWith', 'endsWith', 'includes', 'excludes', 'is not'].filter(
      method => method.startsWith(lastWord)
    );
  }
  
  // Tab suggestions after FOR
  if (words.includes('for') && words.indexOf('for') === words.length - 2) {
    const tabSuggestions = ['_GLOBAL', ...state.allUserTabs.map(tab => tab.tabName)];
    return tabSuggestions.filter(
      tab => tab.toLowerCase().includes(lastWord)
    );
  }
  
  return [];
});

// Determine if we can create a rule
const canCreateRule = computed(() => {
  return newRuleCommand.value.includes('WHEN') && 
         newRuleCommand.value.includes('FOR');
});

// Get the appropriate icon for command typing
const getIconForCommandType = computed(() => {
  const command = newRuleCommand.value.toLowerCase();
  if (command.startsWith('categorize')) return FolderCheck;
  if (command.startsWith('sort')) return SortAsc;
  if (command.startsWith('filter')) return Filter;
  if (command.startsWith('groupby')) return Group;
  return null;
});

// Get the appropriate color for command typing
const getColorForCommandType = computed(() => {
  const command = newRuleCommand.value.toLowerCase();
  if (command.startsWith('categorize')) return 'teal';
  if (command.startsWith('sort')) return 'cyan';
  if (command.startsWith('filter')) return 'amber';
  if (command.startsWith('groupby')) return 'indigo';
  return 'blue';
});

// Get colored command with syntax highlighting
const newRuleColoredCommand = computed(() => {
  if (!newRuleCommand.value.trim()) {
    return '<span class="text-gray-500">Type to create a new rule (e.g. categorize AS Groceries WHEN ...)</span>';
  }
  
  const words = newRuleCommand.value.split(' ');
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
      result += `<span class="text-${getColorForCommandType.value}-500 font-bold">${word}</span>`;
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

// Focus the new rule input
function focusNewInput() {
  nextTick(() => {
    if (newRuleInputRef.value) {
      newRuleInputRef.value.focus();
    }
  });
}

// Handle keydown in new rule input
function handleNewRuleKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (selectedSuggestionIndex.value < suggestions.value.length - 1) {
      selectedSuggestionIndex.value++;
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (selectedSuggestionIndex.value > 0) {
      selectedSuggestionIndex.value--;
    }
  } else if (event.key === 'Tab' || event.key === 'Enter') {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      createNewRule();
      return;
    }
    
    if (suggestions.value.length > 0) {
      event.preventDefault();
      // Always select the highlighted suggestion (or first if none highlighted)
      const indexToSelect = selectedSuggestionIndex.value >= 0 ? selectedSuggestionIndex.value : 0;
      selectSuggestion(suggestions.value[indexToSelect]);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      autoInsertFillerWords();
    }
  } else if (event.key === ' ') {
    // Check if we should auto-insert filler words after space
    nextTick(() => {
      if (newRuleInputRef.value) {
        cursorPosition.value = newRuleInputRef.value.selectionStart;
      }
      autoInsertFillerWords();
    });
  } else {
    // Update cursor position for all other keys
    nextTick(() => {
      if (newRuleInputRef.value) {
        cursorPosition.value = newRuleInputRef.value.selectionStart;
      }
    });
  }
}

// Auto-insert filler words based on current command
function autoInsertFillerWords() {
  if (!newRuleInputRef.value) return;
  
  const currentText = newRuleCommand.value;
  const cursorPos = newRuleInputRef.value.selectionStart;
  
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
    newRuleCommand.value = newText;
    nextTick(() => {
      if (newRuleInputRef.value) {
        newRuleInputRef.value.selectionStart = insertPosition + insertion.length;
        newRuleInputRef.value.selectionEnd = insertPosition + insertion.length;
        cursorPosition.value = insertPosition + insertion.length;
      }
    });
  }
}

// Select a suggestion
function selectSuggestion(suggestion) {
  if (!newRuleInputRef.value) return;
  
  const currentText = newRuleCommand.value;
  const cursorPos = newRuleInputRef.value.selectionStart;
  const textBeforeCursor = currentText.substring(0, cursorPos);
  const textAfterCursor = currentText.substring(cursorPos);
  
  // Find the last word before cursor
  const lastSpaceIndex = textBeforeCursor.lastIndexOf(' ');
  const lastWordStart = lastSpaceIndex !== -1 ? lastSpaceIndex + 1 : 0;
  
  // Replace the last word with the suggestion
  const newText = textBeforeCursor.substring(0, lastWordStart) + suggestion + textAfterCursor;
  newRuleCommand.value = newText;
  
  nextTick(() => {
    if (newRuleInputRef.value) {
      const newCursorPos = lastWordStart + suggestion.length;
      newRuleInputRef.value.selectionStart = newCursorPos;
      newRuleInputRef.value.selectionEnd = newCursorPos;
      
      // Check if we should auto-insert filler words
      autoInsertFillerWords();
    }
  });
}

// Create a new rule
async function createNewRule() {
  if (!canCreateRule.value) return;
  
  try {
    // Parse the command string to rule object
    const commandParts = parseCommandString(newRuleCommand.value);
    const ruleObject = parseCommandToRule(commandParts);
    
    // Create the rule
    await createRule(ruleObject);
    
    // Reset the input
    newRuleCommand.value = '';
    
    nextTick(() => {
      if (newRuleInputRef.value) {
        newRuleInputRef.value.focus();
      }
    });
  } catch (error) {
    console.error('Error creating rule:', error);
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
  const typeMatch = commandStr.match(/^(\w+)/i);
  if (typeMatch) parts.type = typeMatch[1].toLowerCase();
  
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
  const tabsMatch = commandStr.match(/FOR ([^t]+?) tabs/i);
  if (tabsMatch) parts.tabs = tabsMatch[1].trim();
  
  return parts;
}

// Update an existing rule
async function updateExistingRule(updatedRule) {
  try {
    await updateRule(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
  }
}

// Delete a rule
async function deleteRule(ruleId) {
  try {
    await deleteRuleById(ruleId);
  } catch (error) {
    console.error('Error deleting rule:', error);
  }
}

// Focus the input when component is mounted
onMounted(() => {
  nextTick(() => {
    if (newRuleInputRef.value) {
      newRuleInputRef.value.focus();
    }
  });
});
</script>

<style scoped>
.font-mono {
  font-family: 'Consolas', 'Monaco', 'Source Code Pro', monospace;
}

.rule-new-input {
  position: sticky;
  bottom: 0;
  background-color: #121212;
  padding: 1rem;
  margin-top: 1rem;
  z-index: 5;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.3);
}
</style> 