<template>
  <div class="flex flex-col bg-white min-h-screen" data-no-pull-refresh>
    <div class="max-w-3xl mx-auto w-full flex flex-col min-h-screen">
      <!-- Header Area -->
      <div class="px-6 py-0 border-b-2 border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20 backdrop-blur-sm bg-white/90">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <div v-if="state.selected.tab && !isEditingTabName" class="relative">
              <button
                @click="toggleTabActionsMenu"
                class="p-2 text-black hover:text-black hover:bg-gray-100 rounded-full transition-all"
                title="Tab actions"
              >
                <MoreVertical class="w-5 h-5" />
              </button>

              <div
                v-if="showTabActionsMenu"
                class="absolute left-0 mt-2 min-w-[180px] bg-white border-2 border-gray-100 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.06)] p-1 z-30"
              >
                <button
                  @click="startTabNameEdit"
                  class="w-full text-left px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit class="w-4 h-4" />
                  Edit Name
                </button>
                <button
                  @click="copyCurrentTabSchema"
                  class="w-full text-left px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Copy class="w-4 h-4" />
                  Copy Schema
                </button>
                <button
                  @click="openExportRulesModal"
                  class="w-full text-left px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowDownToLine class="w-4 h-4" />
                  Export Rules...
                </button>
                <button
                  @click="openImportRulesModal"
                  class="w-full text-left px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowUpFromLine class="w-4 h-4" />
                  Import Rules...
                </button>
              </div>
            </div>

            <h1 class="text-3xl font-bold zfont-black text-gray-900 tracking-tight leading-tight">
              {{ state.selected.tab?.tabName || 'Current Tab' }}
            </h1>
          </div>
          <div
            v-if="state.selected.tab && isEditingTabName"
            class="mt-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 p-4"
          >
            <label class="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Tab Name</label>
            <div class="mt-2 flex flex-col sm:flex-row gap-2">
              <input
                ref="tabNameInput"
                v-model="editedTabName"
                class="w-full px-3 py-2 text-sm font-black bg-white border-2 border-black rounded-xl focus:outline-none focus:ring-0"
                @keyup.enter="saveTabName"
                @keyup.esc="cancelTabNameEdit"
              />
              <div class="flex items-center gap-2 shrink-0">
                <button
                  @click="saveTabName"
                  :disabled="isSavingTabName || !canSaveTabName"
                  class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border-2 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-black text-white border-black hover:bg-gray-800"
                >
                  <Check class="w-4 h-4" />
                  {{ isSavingTabName ? 'Saving...' : 'Save' }}
                </button>
                <button
                  @click="cancelTabNameEdit"
                  :disabled="isSavingTabName"
                  class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border-2 border-gray-200 text-gray-500 hover:border-black hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-2 text-black hover:text-black hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="p-6 pb-32">
        <div class="space-y-12">
          <!-- Group By Section -->
          <div v-show="!props.section || props.section === 'groupBy'" class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-gray-50 text-gray-400">
                <Group class="w-5 h-5" />
              </div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                Group By
              </h3>
              <span
                v-if="groupByRules.length > 1"
                class="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
              >
                {{ groupByRules.length }}
              </span>
            </div>
            <div class="space-y-4 pt-2">
              <div class="rounded-2xl border-2 border-gray-100 bg-gray-50/40 p-4">
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="groupOption in GROUP_BY_OPTIONS"
                    :key="`group-by-${groupOption.value}`"
                    @click="selectGroupByOption(groupOption.value)"
                    :disabled="isSavingGroupBy"
                    class="px-3 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    :style="getGroupByButtonStyle(groupOption.value)"
                  >
                    {{ groupOption.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sort Section -->
          <div v-show="!props.section || props.section === 'sort'" class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-gray-50 text-gray-400">
                <SortAsc class="w-5 h-5" />
              </div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                Sort By
              </h3>
              <span
                v-if="sortRules.length > 1"
                class="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
              >
                {{ sortRules.length }}
              </span>
            </div>
            <div class="space-y-4 pt-2">
              <div class="rounded-2xl border-2 border-gray-100 bg-gray-50/40 p-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Key</label>
                    <div class="flex flex-wrap gap-2 pt-1">
                      <button
                        v-for="sortPropertyOption in SORT_PROPERTY_OPTIONS"
                        :key="`sort-property-${sortPropertyOption.value}`"
                        @click="onSortPropertyChange(sortPropertyOption.value)"
                        :disabled="isSavingSort"
                        class="px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        :style="getSortButtonStyle(sortPropertyOption.value, selectedSortProperty)"
                      >
                        {{ sortPropertyOption.label }}
                      </button>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Direction</label>
                    <div class="flex flex-wrap gap-2 pt-1">
                      <button
                        v-for="sortDirectionOption in getSortDirectionOptions(selectedSortProperty)"
                        :key="`sort-direction-${selectedSortProperty}-${sortDirectionOption.value}`"
                        @click="onSortDirectionChange(sortDirectionOption.value)"
                        :disabled="isSavingSort"
                        class="px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        :style="getSortButtonStyle(sortDirectionOption.value, selectedSortDirection)"
                      >
                        {{ sortDirectionOption.label }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Categorize + Filter Rule Sections -->
          <div v-for="ruleType in standardRuleTypes" :key="ruleType.id" v-show="!props.section || props.section === ruleType.id" class="space-y-4">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-gray-50 text-gray-400">
                <component :is="ruleType.icon" class="w-5 h-5" />
              </div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em] text-gray-400">
                {{ ruleType.name }}
              </h3>
              <span
                v-if="getRuleCountByType(ruleType.id, true) > 0"
                class="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
              >
                {{ getRuleCountByType(ruleType.id, true) }}
              </span>
            </div>

            <div class="space-y-4 pt-2">
              <div class="flex items-center justify-between px-1">
                <button
                  @click="toggleReorderMode(ruleType.id)"
                  v-if="getRuleCountByType(ruleType.id, true) > 0"
                  class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                  :class="reorderingSectionId === ruleType.id ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:text-black'"
                >
                  {{ reorderingSectionId === ruleType.id ? 'Done' : 'Rearrange' }}
                </button>

                <button
                  v-if="reorderingSectionId !== ruleType.id"
                  @click="createNewRuleWithType(ruleType.id)"
                  class="text-[10px] font-black uppercase tracking-widest text-black hover:opacity-70 flex items-center gap-1.5 transition-opacity"
                >
                  <Plus class="w-3.5 h-3.5" />
                  Add Rule
                </button>
              </div>

              <div
                v-if="getRulesForSection(ruleType.id).length === 0"
                class="py-12 px-6 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-3"
              >
                <p class="text-sm font-bold text-black">No active {{ ruleType.name.toLowerCase() }}</p>
              </div>

              <div v-else>
                <draggable
                  v-model="enabledRulesByTypeComputed[ruleType.id]"
                  item-key="_id"
                  class="space-y-3"
                  handle=".drag-handle"
                  @end="onDragEnd"
                  :disabled="reorderingSectionId !== ruleType.id"
                  :data-rule-type="ruleType.id"
                >
                  <template #item="{ element, index }">
                    <div class="space-y-3">
                      <div
                        v-if="ruleType.id === 'filter' && index > 0 && reorderingSectionId !== ruleType.id"
                        class="mx-auto w-fit rounded-full border-2 border-dashed border-gray-100 bg-gray-50/50 px-3 py-1 flex items-center gap-2"
                      >
                        <span class="text-[9px] font-black uppercase tracking-widest text-gray-400">Combine with</span>
                        <select
                          :value="getFilterJoinOperator(element)"
                          @change="updateFilterJoinOperator(element, $event.target.value)"
                          class="appearance-none bg-transparent text-[10px] font-black uppercase tracking-widest text-black hover:text-gray-500 cursor-pointer focus:outline-none"
                        >
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                      </div>

                      <RuleCard
                        :rule="element"
                        :rule-type="ruleType"
                        :is-reordering="reorderingSectionId === ruleType.id"
                        @edit="editRule"
                        @toggle="toggleRuleContextStatus"
                        @delete="confirmDeleteRule"
                      />
                    </div>
                  </template>
                </draggable>
              </div>

              <div v-if="ruleType.id === 'categorize' && getDisabledRulesByType('categorize').length > 0" class="mt-8">
                <button
                  @click="toggleDisabledSection"
                  class="w-full flex items-center gap-4 group py-4"
                >
                  <div class="h-[2px] flex-1 bg-gray-50"></div>
                  <div class="text-[10px] font-black text-black group-hover:text-black transition-colors uppercase tracking-[0.3em] flex items-center gap-2">
                    Disabled ({{ getDisabledRulesByType('categorize').length }})
                    <ChevronDown :class="['w-3 h-3 transition-transform', disabledSectionCollapsed ? '' : 'rotate-180']" />
                  </div>
                  <div class="h-[2px] flex-1 bg-gray-50"></div>
                </button>

                <div v-if="!disabledSectionCollapsed" class="space-y-3 mt-4">
                  <RuleCard
                    v-for="rule in getDisabledRulesByType('categorize')"
                    :key="rule._id"
                    :rule="rule"
                    :rule-type="ruleType"
                    @edit="editRule"
                    @toggle="toggleRuleContextStatus"
                    @delete="confirmDeleteRule"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="state.selected.tab" v-show="!props.section || props.section === 'advanced'" class="space-y-4">
            <button
              type="button"
              class="w-full flex items-center gap-3 py-1 group"
              @click="toggleAdvancedSection"
            >
              <span class="h-px flex-1 bg-gray-200"></span>
              <span class="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400 group-hover:text-black transition-colors">
                Advanced
              </span>
              <span
                v-if="isRecategorizeWarningUnresolved"
                class="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-[9px] font-black uppercase tracking-[0.12em] text-amber-700"
              >
                Action
              </span>
              <ChevronDown
                class="w-3.5 h-3.5 text-gray-400 group-hover:text-black transition-all"
                :class="isAdvancedSectionOpen ? 'rotate-180' : ''"
              />
              <span class="h-px flex-1 bg-gray-200"></span>
            </button>

            <div v-if="isAdvancedSectionOpen" class="rounded-2xl border-2 border-gray-100 bg-gray-50/40 p-4 space-y-5">
              <div class="space-y-2">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Should transaction-level categories override categories set at this level?</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    :disabled="isSavingRecategorizePreference"
                    class="px-3 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                    :class="recategorizeBehaviorDecision === 'honor'
                      ? 'bg-white text-black border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'"
                    @click="onRecategorizeBehaviorDecisionChange('honor')"
                  >
                    <span>Yes, transactions categories take priority</span>
                    <span v-if="recategorizeBehaviorDecision === 'honor'" class="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em]">
                      <Check class="w-3.5 h-3.5" />
                      Selected
                    </span>
                  </button>
                  <button
                    type="button"
                    :disabled="isSavingRecategorizePreference"
                    class="px-3 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                    :class="recategorizeBehaviorDecision === 'override'
                      ? 'bg-white text-black border-black'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'"
                    @click="onRecategorizeBehaviorDecisionChange('override')"
                  >
                    <span>No, categories set in this tab take priority</span>
                    <span v-if="recategorizeBehaviorDecision === 'override'" class="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em]">
                      <Check class="w-3.5 h-3.5" />
                      Selected
                    </span>
                  </button>
                </div>
              </div>

              <div class="pt-4 border-t border-red-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p class="text-xs font-black uppercase tracking-[0.2em] text-black-500">Delete Tab</p>
                <button
                  @click="deleteCurrentTab"
                  :disabled="isDeletingTab"
                  class="px-4 py-2 rounded-xl border-2 border-red-200 text-black-600 text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 class="w-4 h-4" />
                  {{ isDeletingTab ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <div
        v-if="isExportRulesModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        style="background-color: var(--theme-overlay-30);"
        @click.self="closeExportRulesModal"
      >
        <div
          class="w-full max-w-2xl rounded-2xl border shadow-[0_20px_60px_-24px_var(--theme-overlay-50)] overflow-hidden"
          style="background-color: var(--theme-browser-chrome); border-color: var(--theme-border); color: var(--theme-text);"
        >
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b" style="border-color: var(--theme-border);">
            <div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em]">Export Rules</h3>
              <p class="text-xs mt-1" style="color: var(--theme-text-soft);">
                Export rules for the current tab level and breadcrumb path.
              </p>
            </div>
            <button
              type="button"
              class="rounded-full p-2 border transition-opacity hover:opacity-70"
              style="border-color: var(--theme-border);"
              @click="closeExportRulesModal"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="px-5 py-5 space-y-5">
            <div class="space-y-2">
              <p class="text-[10px] font-black uppercase tracking-[0.2em]" style="color: var(--theme-text-soft);">Format</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="formatOption in RULE_TRANSFER_FORMATS"
                  :key="`export-format-${formatOption}`"
                  type="button"
                  class="px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
                  :style="optionButtonStyle(exportFormat === formatOption)"
                  @click="exportFormat = formatOption"
                >
                  {{ formatOption.toUpperCase() }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[10px] font-black uppercase tracking-[0.2em]" style="color: var(--theme-text-soft);">Scope</p>
              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  class="w-full rounded-xl border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
                  :style="optionButtonStyle(exportScope === 'all')"
                  @click="exportScope = 'all'"
                >
                  All rules at this level
                </button>
                <button
                  type="button"
                  class="w-full rounded-xl border px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
                  :style="optionButtonStyle(exportScope === 'visible')"
                  @click="exportScope = 'visible'"
                >
                  {{ visibleScopeDescription }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label class="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
                <input
                  v-model="includeExportMetadata"
                  type="checkbox"
                  :disabled="exportFormat !== 'json'"
                  class="h-4 w-4 rounded border"
                  style="accent-color: var(--theme-text); border-color: var(--theme-border);"
                >
                Include metadata wrapper (JSON only)
              </label>
              <p
                v-if="exportFormat !== 'json'"
                class="text-xs"
                style="color: var(--theme-text-soft);"
              >
                CSV and Markdown exports always use flat row records without a metadata wrapper.
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-4 border-t" style="border-color: var(--theme-border);">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
              :style="actionButtonStyle(false)"
              @click="closeExportRulesModal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
              :style="actionButtonStyle(true)"
              @click="exportRules"
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="isImportRulesModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        style="background-color: var(--theme-overlay-30);"
        @click.self="closeImportRulesModal"
      >
        <div
          class="w-full max-w-2xl rounded-2xl border shadow-[0_20px_60px_-24px_var(--theme-overlay-50)] overflow-hidden"
          style="background-color: var(--theme-browser-chrome); border-color: var(--theme-border); color: var(--theme-text);"
        >
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b" style="border-color: var(--theme-border);">
            <div>
              <h3 class="text-sm font-black uppercase tracking-[0.2em]">Import Rules</h3>
              <p class="text-xs mt-1" style="color: var(--theme-text-soft);">
                Preview changes before applying to this tab level and breadcrumb path.
              </p>
            </div>
            <button
              type="button"
              class="rounded-full p-2 border transition-opacity hover:opacity-70"
              style="border-color: var(--theme-border);"
              @click="closeImportRulesModal"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="px-5 py-5 space-y-5">
            <div class="space-y-2">
              <p class="text-[10px] font-black uppercase tracking-[0.2em]" style="color: var(--theme-text-soft);">Format</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="formatOption in RULE_TRANSFER_FORMATS"
                  :key="`import-format-${formatOption}`"
                  type="button"
                  class="px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
                  :style="optionButtonStyle(importFormat === formatOption)"
                  @click="importFormat = formatOption"
                >
                  {{ formatOption.toUpperCase() }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <input
                ref="importFileInputRef"
                type="file"
                class="hidden"
                :accept="importFormat === 'json' ? '.json,application/json' : (importFormat === 'csv' ? '.csv,text/csv' : '.md,.markdown,text/markdown,text/plain')"
                @change="handleImportFileSelection"
              >
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
                  :style="actionButtonStyle(false)"
                  @click="triggerImportFilePicker"
                >
                  Choose File
                </button>
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
                  :style="actionButtonStyle(false)"
                  :disabled="!importRawText.trim() || isPreparingImportPreview"
                  @click="prepareImportPreview"
                >
                  {{ isPreparingImportPreview ? 'Reading...' : 'Refresh Preview' }}
                </button>
              </div>
              <p v-if="importFileName" class="text-xs" style="color: var(--theme-text-soft);">
                Selected file: {{ importFileName }}
              </p>
            </div>

            <div
              v-if="importParseError"
              class="rounded-xl border px-3 py-2 text-xs"
              style="border-color: var(--theme-border); background-color: var(--theme-overlay-20); color: var(--theme-text);"
            >
              {{ importParseError }}
            </div>

            <div
              v-if="importPreview"
              class="rounded-xl border px-4 py-3 space-y-3"
              style="border-color: var(--theme-border); background-color: var(--theme-overlay-20);"
            >
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div>Total rows: <span class="font-black">{{ importPreview.totalCount }}</span></div>
                <div>Valid rules: <span class="font-black">{{ importPreview.parsedCount }}</span></div>
                <div>Will update: <span class="font-black">{{ importPreview.updates }}</span></div>
                <div>Will add: <span class="font-black">{{ importPreview.creates }}</span></div>
                <div>Skipped globals: <span class="font-black">{{ importPreview.skippedGlobal }}</span></div>
                <div>Invalid rows: <span class="font-black">{{ importPreview.invalidCount + importPreview.skippedInvalid }}</span></div>
              </div>

              <div class="space-y-1">
                <p class="text-[10px] font-black uppercase tracking-[0.2em]" style="color: var(--theme-text-soft);">By Type</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    v-for="typeEntry in importPreviewByTypeEntries"
                    :key="`preview-type-${typeEntry.typeId}`"
                    class="rounded-lg border px-2 py-1.5"
                    style="border-color: var(--theme-border);"
                  >
                    <span class="font-black">{{ typeEntry.label }}</span>
                    <span class="ml-1" style="color: var(--theme-text-soft);">
                      {{ typeEntry.updates }} updated, {{ typeEntry.creates }} added
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-4 border-t" style="border-color: var(--theme-border);">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
              :style="actionButtonStyle(false)"
              @click="closeImportRulesModal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              :style="actionButtonStyle(true)"
              :disabled="!canApplyImport || isApplyingImport"
              @click="applyImportRules"
            >
              {{ isApplyingImport ? 'Importing...' : 'Apply Import' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <RuleEditModal
      v-if="showRuleEditModal"
      :rule="currentRule"
      :is-new="isNewRule"
      scope="tab"
      :fixed-type="true"
      :show-categorize-set-target="isCustomRuleEditorMode"
      :initial-make-global="initialMakeGlobalForEditor"
      @close="closeRuleEditModal"
      @save="saveRule"
    />

    <DeleteConfirmModal
      v-if="showDeleteModal"
      :rule="ruleToDelete"
      @cancel="showDeleteModal = false"
      @confirm="deleteRule"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import {
  Plus,
  ChevronDown,
  SortAsc,
  FolderCheck,
  Group,
  Filter,
  Edit,
  X,
  Check,
  Trash2,
  MoreVertical,
  Copy,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabsAPI } from '@/features/tabs/composables/useTabsAPI';
import { useRulesAPI } from '../composables/useRulesAPI';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing';
import { useTabs } from '@/features/tabs/composables/useTabs';
import { resolveDrillState } from '@/features/tabs/utils/drillEvaluator.js';
import { levelRulesForDepth, normalizeDrillPath } from '@/features/tabs/utils/drillSchema.js';
import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';
import draggable from 'vuedraggable';

import RuleCard from '../components/RuleCard.vue';
import RuleEditModal from '../components/RuleEditModal.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import {
  RULE_TRANSFER_FORMATS,
  buildRuleExportContent,
  parseRuleImportContent,
  mergeImportedRules,
  ruleTransferFileExtension
} from '../utils/ruleTransfer.js';

const { state } = useDashboardState();
const { updateTabName, deleteTab: deleteTabById } = useTabsAPI();
const rulesAPI = useRulesAPI();
const { processAllTabsForSelectedGroup } = useTabProcessing();
const {
  updateTabDrillSchemaAtPath,
  copyTabSchemaToGroup
} = useTabs();

const props = defineProps({
  section: {
    type: String,
    default: null
  },
  openCustomRuleEditor: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'category', label: 'Category' },
  { value: 'name', label: 'Name' },
  { value: 'label', label: 'Label' },
  { value: 'date', label: 'Day' },
  { value: 'year_month', label: 'Month' },
  { value: 'weekday', label: 'Weekday' }
];

const SORT_PROPERTY_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'label', label: 'Label' },
  { value: 'date', label: 'Date' },
  { value: 'category', label: 'Category' },
  { value: 'amount', label: 'Amount' }
];

const SORT_DIRECTION_OPTIONS = [
  { value: 'asc' },
  { value: 'desc' }
];
const RECAT_BEHAVIOR_RULE_MARKER_PREFIX = '__recat_behavior:';

const standardRuleTypes = [
  { id: 'custom', name: 'Custom Rules', icon: FolderCheck },
  { id: 'categorize', name: 'Categorize Rules', icon: FolderCheck },
  { id: 'filter', name: 'Filter Rules', icon: Filter }
];

const LOCAL_RULE_TYPES = ['groupBy', 'sort', 'categorize', 'filter'];

function safeOrder(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cloneRule(rule) {
  return JSON.parse(JSON.stringify(rule || {}));
}

function createLocalRule(typeId, ruleArray = [], options = {}) {
  const tabId = state.selected.tab?._id;
  const {
    filterJoinOperator = 'and',
    _isImportant = false,
    orderOfExecution = 0,
    _id = `${typeId}-${Math.random().toString(36).slice(2, 10)}`
  } = options;

  return {
    _id,
    rule: Array.isArray(ruleArray)
      ? ruleArray.map(value => String(value ?? ''))
      : [typeId, '', '', '', ''],
    applyForTabs: tabId ? [tabId] : [],
    filterJoinOperator: String(filterJoinOperator || '').toLowerCase() === 'or' ? 'or' : 'and',
    _isImportant: Boolean(_isImportant),
    orderOfExecution: safeOrder(orderOfExecution),
    _isLocal: true
  };
}

function sanitizeRuleType(typeId = '') {
  return LOCAL_RULE_TYPES.includes(typeId) ? typeId : 'categorize';
}

function isCategorizeSetTarget(target) {
  const normalizedTarget = String(target || '').trim().toLowerCase();
  return normalizedTarget === 'category' || normalizedTarget === 'name' || normalizedTarget === 'label';
}

function normalizeCategorizeSetTarget(target) {
  const normalizedTarget = String(target || '').trim().toLowerCase();
  if (normalizedTarget === 'name') {
    return 'name';
  }

  if (normalizedTarget === 'label') {
    return 'label';
  }

  return 'category';
}

function resolveCategorizeRuleSetTarget(ruleConfig) {
  const rule = Array.isArray(ruleConfig?.rule) ? ruleConfig.rule : [];
  if (rule[0] !== 'categorize') {
    return null;
  }

  const usesSetTargetFormat = rule.length >= 6
    && (rule.length - 6) % 4 === 0
    && isCategorizeSetTarget(rule[4]);

  if (usesSetTargetFormat) {
    return normalizeCategorizeSetTarget(rule[4]);
  }

  return 'category';
}

function isCategorizeCategoryRule(ruleConfig) {
  return resolveCategorizeRuleSetTarget(ruleConfig) === 'category';
}

function isCustomSectionRule(ruleConfig) {
  const setTarget = resolveCategorizeRuleSetTarget(ruleConfig);
  return setTarget !== 'category';
}

function normalizeLocalRule(typeId, rule) {
  const normalizedType = sanitizeRuleType(typeId || rule?.rule?.[0]);
  return createLocalRule(normalizedType, rule?.rule, {
    _id: String(rule?._id || `${normalizedType}-${Math.random().toString(36).slice(2, 10)}`),
    filterJoinOperator: rule?.filterJoinOperator,
    _isImportant: rule?._isImportant,
    orderOfExecution: rule?.orderOfExecution
  });
}

function normalizeLocalRuleList(typeId, rules = []) {
  return (Array.isArray(rules) ? rules : [])
    .map(rule => normalizeLocalRule(typeId, rule))
    .sort((a, b) => safeOrder(a.orderOfExecution) - safeOrder(b.orderOfExecution));
}

function stripEditorFields(rule) {
  return {
    _id: String(rule?._id || ''),
    rule: Array.isArray(rule?.rule)
      ? rule.rule.map(value => String(value ?? ''))
      : [],
    filterJoinOperator: String(rule?.filterJoinOperator || '').toLowerCase() === 'or' ? 'or' : 'and',
    _isImportant: Boolean(rule?._isImportant),
    orderOfExecution: safeOrder(rule?.orderOfExecution)
  };
}

const showRuleEditModal = ref(false);
const showDeleteModal = ref(false);
const currentRule = ref(null);
const isNewRule = ref(false);
const ruleToDelete = ref(null);
const disabledSectionCollapsed = ref(true);
const isSavingGroupBy = ref(false);
const isSavingSort = ref(false);

const isEditingTabName = ref(false);
const editedTabName = ref('');
const tabNameInput = ref(null);
const isSavingTabName = ref(false);
const isDeletingTab = ref(false);
const showTabActionsMenu = ref(false);
const reorderingSectionId = ref(null);
const isSavingRecategorizePreference = ref(false);
const isAdvancedSectionOpen = ref(false);
const isCustomRuleEditorMode = ref(false);
const hasConsumedCustomEditorRequest = ref(false);
const initialMakeGlobalForEditor = ref(false);
const isExportRulesModalOpen = ref(false);
const isImportRulesModalOpen = ref(false);
const exportFormat = ref('json');
const exportScope = ref('all');
const includeExportMetadata = ref(false);
const importFormat = ref('json');
const importFileName = ref('');
const importRawText = ref('');
const importPreview = ref(null);
const importPendingRulesByType = ref(null);
const importParseError = ref('');
const isPreparingImportPreview = ref(false);
const isApplyingImport = ref(false);
const importFileInputRef = ref(null);

const currentDepth = computed(() => {
  const path = Array.isArray(state.selected.drillPath) ? state.selected.drillPath : [];
  return path.length;
});
const currentPathKey = computed(() => normalizeDrillPath(state.selected.drillPath).join('>'));

const localRulesByType = ref({
  groupBy: [],
  sort: [],
  categorize: [],
  filter: []
});

const canSaveTabName = computed(() => {
  if (!state.selected.tab) return false;

  const nextTabName = editedTabName.value.trim();
  const currentTabName = (state.selected.tab.tabName || '').trim();
  if (!nextTabName) return false;

  return nextTabName !== currentTabName;
});

function getEnabledRulesByType(typeId) {
  const normalizedType = sanitizeRuleType(typeId);
  return [...(localRulesByType.value[normalizedType] || [])]
    .sort((a, b) => safeOrder(a.orderOfExecution) - safeOrder(b.orderOfExecution));
}

function getRulesForSection(typeId) {
  if (typeId === 'custom') {
    return getEnabledRulesByType('categorize')
      .filter(rule => isCustomSectionRule(rule));
  }

  if (typeId === 'categorize') {
    return getEnabledRulesByType('categorize')
      .filter(rule => isCategorizeCategoryRule(rule));
  }

  return getEnabledRulesByType(typeId);
}

const currentSectionId = computed(() => {
  const normalizedSection = String(props.section || '').trim();
  if (['groupBy', 'sort', 'categorize', 'filter', 'custom'].includes(normalizedSection)) {
    return normalizedSection;
  }

  return '';
});

const visibleScopeDescription = computed(() => {
  if (!currentSectionId.value) {
    return 'Visible rules in current section (all sections)';
  }

  if (currentSectionId.value === 'groupBy') {
    return 'Visible rules in current section (group by)';
  }

  if (currentSectionId.value === 'sort') {
    return 'Visible rules in current section (sort)';
  }

  if (currentSectionId.value === 'filter') {
    return 'Visible rules in current section (filter)';
  }

  if (currentSectionId.value === 'custom') {
    return 'Visible rules in current section (custom)';
  }

  return 'Visible rules in current section (categorize)';
});

const canApplyImport = computed(() => {
  return Boolean(importPreview.value && Number(importPreview.value.applied) > 0 && importPendingRulesByType.value);
});

const importPreviewByTypeEntries = computed(() => {
  const byType = importPreview.value?.byType || {};
  const labels = importPreview.value?.labels || {};
  return Object.keys(byType).map((typeId) => {
    const entry = byType[typeId] || {};
    return {
      typeId,
      label: labels[typeId] || typeId,
      updates: Number(entry.updates || 0),
      creates: Number(entry.creates || 0)
    };
  });
});

function isGlobalCategorizeRule(rule) {
  const applyForTabs = Array.isArray(rule?.applyForTabs) ? rule.applyForTabs : [];
  return rule?.rule?.[0] === 'categorize' && applyForTabs.includes('_GLOBAL');
}

function findGlobalCategorizeRuleById(ruleId) {
  if (!ruleId) {
    return null;
  }

  return state.allUserRules.find((rule) =>
    rule?._id === ruleId && isGlobalCategorizeRule(rule)
  ) || null;
}

function nextGlobalCategorizeOrder() {
  const globalCategorizeRules = state.allUserRules.filter(isGlobalCategorizeRule);
  if (!globalCategorizeRules.length) {
    return 0;
  }

  return Math.max(...globalCategorizeRules.map(rule => safeOrder(rule?.orderOfExecution, 0))) + 1;
}

function getDisabledRulesByType() {
  return [];
}

function getRuleCountByType(typeId, enabledOnly = false) {
  if (enabledOnly) {
    return getRulesForSection(typeId).length;
  }

  return getRulesForSection(typeId).length;
}

const enabledRules = computed(() => [
  ...getEnabledRulesByType('groupBy'),
  ...getEnabledRulesByType('sort'),
  ...getEnabledRulesByType('categorize'),
  ...getEnabledRulesByType('filter')
]);

const disabledRules = computed(() => []);
const groupByRules = computed(() => getEnabledRulesByType('groupBy'));
const sortRules = computed(() => getEnabledRulesByType('sort'));

function getPrimaryRuleForCurrentTab(rules = []) {
  return rules[0] || null;
}

const selectedGroupByOption = computed(() => {
  const primaryGroupByRule = getPrimaryRuleForCurrentTab(groupByRules.value);
  if (!primaryGroupByRule) {
    return 'none';
  }

  return normalizeGroupByOptionForUi(primaryGroupByRule.rule?.[1]);
});

const selectedSortProperty = computed(() => {
  const primarySortRule = getPrimaryRuleForCurrentTab(sortRules.value);
  const normalizedSortPropertyName = normalizeSortPropertyName(primarySortRule?.rule?.[1]);

  return isSortPropertyAllowed(normalizedSortPropertyName)
    ? normalizedSortPropertyName
    : 'date';
});

const selectedSortDirection = computed(() => {
  const primarySortRule = getPrimaryRuleForCurrentTab(sortRules.value);
  const normalizedSortDirection = normalizeSortDirection(
    primarySortRule?.rule?.[2],
    primarySortRule?.rule?.[1]
  );
  const sortDirectionOptions = getSortDirectionOptions(selectedSortProperty.value);

  return sortDirectionOptions.some(option => option.value === normalizedSortDirection)
    ? normalizedSortDirection
    : sortDirectionOptions[0]?.value || 'desc';
});

function normalizeRecategorizeBehaviorDecision(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'honor' || normalizedValue === 'override') {
    return normalizedValue;
  }

  return '';
}

function recategorizeBehaviorRuleMarker(decision) {
  const normalizedDecision = normalizeRecategorizeBehaviorDecision(decision);
  return normalizedDecision
    ? `${RECAT_BEHAVIOR_RULE_MARKER_PREFIX}${normalizedDecision}`
    : '';
}

function applyRecategorizeMarkerToGroupByRule(ruleConfig, decision) {
  const normalizedRule = Array.isArray(ruleConfig?.rule)
    ? ruleConfig.rule.map(value => String(value ?? ''))
    : ['groupBy', 'none', '', '', ''];

  while (normalizedRule.length < 5) {
    normalizedRule.push('');
  }

  normalizedRule[4] = recategorizeBehaviorRuleMarker(decision);

  return {
    ...ruleConfig,
    rule: normalizedRule
  };
}

function resolveRecategorizeBehaviorDecision(tab) {
  return normalizeRecategorizeBehaviorDecision(tab?.recategorizeBehaviorDecision);
}

function resolveRecategorizeBehaviorDecisionForLevel(level, tab, depth = 0) {
  const explicitLevelDecision = resolveRecategorizeBehaviorDecision(level);
  if (explicitLevelDecision) {
    return explicitLevelDecision;
  }

  if (level?.honorRecategorizeAs === true) {
    return 'honor';
  }

  if (Number(depth) !== 0) {
    return '';
  }

  const explicitTabDecision = resolveRecategorizeBehaviorDecision(tab);
  if (explicitTabDecision) {
    return explicitTabDecision;
  }

  if (tab?.honorRecategorizeAs === true) {
    return 'honor';
  }

  return '';
}

const activeDrillLevel = computed(() => {
  if (!state.selected.tab) {
    return null;
  }

  const activePath = Array.isArray(state.selected.drillPath) ? state.selected.drillPath : [];
  const { level } = levelRulesForDepth(state.selected.tab.drillSchema, currentDepth.value, activePath);
  return level || null;
});

const recategorizeBehaviorDecision = computed(() => resolveRecategorizeBehaviorDecisionForLevel(
  activeDrillLevel.value,
  state.selected.tab,
  currentDepth.value
));
const hasRecategorizeBehaviorDecision = computed(() => Boolean(recategorizeBehaviorDecision.value));
const currentDrillState = computed(() => resolveDrillState({
  tab: state.selected.tab,
  transactions: state.selected.allGroupTransactions,
  allRules: state.allUserRules,
  drillPath: state.selected.drillPath
}));
const overriddenRecategorizeCount = computed(() => {
  const count = Number(currentDrillState.value?.overriddenRecategorizeCount || 0);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
});
const hasRecategorizeOverrideWarning = computed(() => overriddenRecategorizeCount.value > 0);
const isRecategorizeWarningUnresolved = computed(() => (
  hasRecategorizeOverrideWarning.value && !hasRecategorizeBehaviorDecision.value
));

const enabledRulesByTypeComputed = computed({
  get: () => {
    const result = {};
    standardRuleTypes.forEach(type => {
      result[type.id] = getRulesForSection(type.id);
    });
    return result;
  },
  set: () => {}
});

function syncLocalRulesFromCurrentDepth() {
  if (!state.selected.tab) {
    localRulesByType.value = {
      groupBy: [],
      sort: [],
      categorize: [],
      filter: []
    };
    return;
  }

  const activePath = Array.isArray(state.selected.drillPath) ? state.selected.drillPath : [];
  const { level } = levelRulesForDepth(state.selected.tab.drillSchema, currentDepth.value, activePath);

  localRulesByType.value = {
    groupBy: normalizeLocalRuleList('groupBy', level.groupByRules),
    sort: normalizeLocalRuleList('sort', level.sortRules),
    categorize: normalizeLocalRuleList('categorize', level.categorizeRules),
    filter: normalizeLocalRuleList('filter', level.filterRules)
  };
}

watch(
  [() => state.selected.tab?._id, () => currentPathKey.value],
  () => {
    syncLocalRulesFromCurrentDepth();
    showTabActionsMenu.value = false;
    isAdvancedSectionOpen.value = isRecategorizeWarningUnresolved.value;
  },
  { immediate: true }
);

watch(
  () => props.openCustomRuleEditor,
  (shouldOpenCustomRuleEditor) => {
    if (!shouldOpenCustomRuleEditor) {
      hasConsumedCustomEditorRequest.value = false;
      return;
    }

    if (hasConsumedCustomEditorRequest.value || !state.selected.tab) {
      return;
    }

    hasConsumedCustomEditorRequest.value = true;
    openCustomRuleEditorForm();
  },
  { immediate: true }
);

watch(
  () => exportFormat.value,
  (nextFormat) => {
    if (nextFormat !== 'json') {
      includeExportMetadata.value = false;
    }
  }
);

watch(
  () => importFormat.value,
  () => {
    if (importRawText.value.trim()) {
      void prepareImportPreview();
    }
  }
);

function buildDepthReplacementPayload() {
  return {
    sortRules: getEnabledRulesByType('sort').map(stripEditorFields),
    categorizeRules: getEnabledRulesByType('categorize').map(stripEditorFields),
    filterRules: getEnabledRulesByType('filter').map(stripEditorFields),
    groupByRules: buildGroupByRulesPayload(recategorizeBehaviorDecision.value)
  };
}

function buildGroupByRulesPayload(decision) {
  const groupByRulesToPersist = getEnabledRulesByType('groupBy')
    .slice(0, 1)
    .map(stripEditorFields);

  const safeGroupByRules = groupByRulesToPersist.length
    ? groupByRulesToPersist
    : [{
        _id: `groupBy-${currentDepth.value + 1}`,
        rule: ['groupBy', selectedGroupByOption.value || 'none', '', '', ''],
        filterJoinOperator: 'and',
        _isImportant: false,
        orderOfExecution: 0
      }];

  return safeGroupByRules.map(ruleConfig => applyRecategorizeMarkerToGroupByRule(ruleConfig, decision));
}

async function persistDepthRules() {
  const tabId = state.selected.tab?._id;
  if (!tabId) {
    return;
  }

  await updateTabDrillSchemaAtPath(tabId, state.selected.drillPath, buildDepthReplacementPayload());
  syncLocalRulesFromCurrentDepth();
}

function withRenumberedOrder(rules = []) {
  return rules.map((rule, index) => ({
    ...rule,
    orderOfExecution: index
  }));
}

function toggleReorderMode(sectionId) {
  if (reorderingSectionId.value === sectionId) {
    reorderingSectionId.value = null;
  } else {
    reorderingSectionId.value = sectionId;
  }
}

function toggleDisabledSection() {
  disabledSectionCollapsed.value = !disabledSectionCollapsed.value;
}

function startTabNameEdit() {
  if (state.selected.tab) {
    closeTabActionsMenu();
    editedTabName.value = state.selected.tab.tabName || '';
    isEditingTabName.value = true;
    nextTick(() => {
      tabNameInput.value?.focus();
      tabNameInput.value?.select?.();
    });
  }
}

async function saveTabName() {
  if (!state.selected.tab || isSavingTabName.value) return;

  const nextTabName = editedTabName.value.trim();
  const previousTabName = state.selected.tab.tabName || '';

  if (!nextTabName) {
    editedTabName.value = previousTabName;
    isEditingTabName.value = false;
    return;
  }

  if (!canSaveTabName.value) {
    isEditingTabName.value = false;
    return;
  }

  isSavingTabName.value = true;
  state.selected.tab.tabName = nextTabName;

  try {
    await updateTabName(state.selected.tab._id, nextTabName);
    editedTabName.value = nextTabName;
    isEditingTabName.value = false;
  } catch (error) {
    state.selected.tab.tabName = previousTabName;
    editedTabName.value = previousTabName;
    console.error('Error updating tab name:', error);
  } finally {
    isSavingTabName.value = false;
  }
}

function cancelTabNameEdit() {
  editedTabName.value = state.selected.tab?.tabName || '';
  isEditingTabName.value = false;
}

function toggleTabActionsMenu() {
  showTabActionsMenu.value = !showTabActionsMenu.value;
}

function closeTabActionsMenu() {
  showTabActionsMenu.value = false;
}

function showRuleTransferMessage(message, durationMs = 2600) {
  const normalizedMessage = String(message || '').trim();
  if (!normalizedMessage) {
    return;
  }

  state.blueBar.loading = false;
  state.blueBar.message = normalizedMessage;

  setTimeout(() => {
    if (state.blueBar.message === normalizedMessage && !state.blueBar.loading) {
      state.blueBar.message = '';
    }
  }, durationMs);
}

function optionButtonStyle(isActive) {
  return {
    backgroundColor: isActive ? 'var(--theme-text)' : 'transparent',
    color: isActive ? 'var(--theme-bg)' : 'var(--theme-text)',
    borderColor: 'var(--theme-border)'
  };
}

function actionButtonStyle(isPrimary = false) {
  return {
    backgroundColor: isPrimary ? 'var(--theme-text)' : 'transparent',
    color: isPrimary ? 'var(--theme-bg)' : 'var(--theme-text)',
    borderColor: 'var(--theme-border)'
  };
}

function resolveAllLevelRulesForTransfer() {
  return [
    ...getEnabledRulesByType('groupBy'),
    ...getEnabledRulesByType('sort'),
    ...getEnabledRulesByType('categorize'),
    ...getEnabledRulesByType('filter')
  ].map(cloneRule);
}

function resolveVisibleSectionRulesForTransfer() {
  if (!currentSectionId.value) {
    return resolveAllLevelRulesForTransfer();
  }

  if (currentSectionId.value === 'groupBy') {
    return getEnabledRulesByType('groupBy').map(cloneRule);
  }

  if (currentSectionId.value === 'sort') {
    return getEnabledRulesByType('sort').map(cloneRule);
  }

  if (currentSectionId.value === 'filter') {
    return getEnabledRulesByType('filter').map(cloneRule);
  }

  if (currentSectionId.value === 'custom') {
    return getRulesForSection('custom').map(cloneRule);
  }

  return getRulesForSection('categorize').map(cloneRule);
}

function resolveRulesForTransferScope(scope = 'all') {
  if (scope === 'visible') {
    return resolveVisibleSectionRulesForTransfer();
  }

  return resolveAllLevelRulesForTransfer();
}

function normalizeFileNameSegment(value, fallback = 'rules') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function downloadTextContent(content, fileName, mimeType = 'application/octet-stream') {
  const blob = new Blob([String(content || '')], { type: mimeType });
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
}

function exportMimeType(format = 'json') {
  if (format === 'csv') {
    return 'text/csv;charset=utf-8';
  }

  if (format === 'markdown') {
    return 'text/markdown;charset=utf-8';
  }

  return 'application/json;charset=utf-8';
}

function openExportRulesModal() {
  if (!state.selected.tab?._id) {
    return;
  }

  closeTabActionsMenu();
  exportFormat.value = 'json';
  exportScope.value = 'all';
  includeExportMetadata.value = false;
  isExportRulesModalOpen.value = true;
}

function closeExportRulesModal() {
  isExportRulesModalOpen.value = false;
}

function buildExportMetadata(scope = 'all') {
  const selectedTab = state.selected.tab;
  const normalizedPath = normalizeDrillPath(state.selected.drillPath);

  return {
    app: 'tracktabs',
    tabId: String(selectedTab?._id || ''),
    tabName: String(selectedTab?.tabName || ''),
    drillPath: normalizedPath,
    depth: normalizedPath.length,
    scope,
    section: currentSectionId.value || 'all',
    exportedAt: new Date().toISOString()
  };
}

function exportRules() {
  if (!state.selected.tab?._id) {
    return;
  }

  const scopedRules = resolveRulesForTransferScope(exportScope.value);
  const selectedTabId = String(state.selected.tab._id || '');
  const formattedContent = buildRuleExportContent({
    rules: scopedRules,
    format: exportFormat.value,
    includeMetadata: exportFormat.value === 'json' && includeExportMetadata.value,
    metadata: buildExportMetadata(exportScope.value),
    defaultApplyForTabs: selectedTabId ? [selectedTabId] : []
  });

  const extension = ruleTransferFileExtension(exportFormat.value);
  const tabSegment = normalizeFileNameSegment(state.selected.tab?.tabName, 'tab');
  const scopeSegment = exportScope.value === 'visible' ? 'visible' : 'all';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${tabSegment}-rules-${scopeSegment}-${timestamp}.${extension}`;

  downloadTextContent(formattedContent, fileName, exportMimeType(exportFormat.value));
  closeExportRulesModal();
  showRuleTransferMessage(`Exported ${scopedRules.length} rule${scopedRules.length === 1 ? '' : 's'}.`);
}

function resetImportModalState() {
  importFileName.value = '';
  importRawText.value = '';
  importPreview.value = null;
  importPendingRulesByType.value = null;
  importParseError.value = '';
  isPreparingImportPreview.value = false;
  isApplyingImport.value = false;
}

function openImportRulesModal() {
  if (!state.selected.tab?._id) {
    return;
  }

  closeTabActionsMenu();
  importFormat.value = 'json';
  resetImportModalState();
  isImportRulesModalOpen.value = true;
}

function closeImportRulesModal() {
  isImportRulesModalOpen.value = false;
  resetImportModalState();
}

function triggerImportFilePicker() {
  importFileInputRef.value?.click();
}

async function handleImportFileSelection(event) {
  const selectedFile = event?.target?.files?.[0];
  if (!selectedFile) {
    return;
  }

  importFileName.value = String(selectedFile.name || '');
  importParseError.value = '';

  try {
    importRawText.value = await selectedFile.text();
    await prepareImportPreview();
  } catch (error) {
    importPreview.value = null;
    importPendingRulesByType.value = null;
    importParseError.value = error instanceof Error ? error.message : 'Unable to read import file.';
  } finally {
    if (event?.target) {
      event.target.value = '';
    }
  }
}

async function prepareImportPreview() {
  if (!state.selected.tab?._id) {
    return;
  }

  const rawText = String(importRawText.value || '');
  if (!rawText.trim()) {
    importPreview.value = null;
    importPendingRulesByType.value = null;
    importParseError.value = 'Choose a file to preview import changes.';
    return;
  }

  importParseError.value = '';
  isPreparingImportPreview.value = true;

  try {
    const selectedTabId = String(state.selected.tab._id || '');
    const parsed = parseRuleImportContent(rawText, importFormat.value, {
      defaultApplyForTabs: selectedTabId ? [selectedTabId] : []
    });

    if (!parsed.totalCount) {
      importPreview.value = null;
      importPendingRulesByType.value = null;
      importParseError.value = 'No rows or rules were found in this file.';
      return;
    }

    const mergeResult = mergeImportedRules({
      existingRulesByType: {
        groupBy: getEnabledRulesByType('groupBy').map(stripEditorFields),
        sort: getEnabledRulesByType('sort').map(stripEditorFields),
        categorize: getEnabledRulesByType('categorize').map(stripEditorFields),
        filter: getEnabledRulesByType('filter').map(stripEditorFields)
      },
      importedRules: parsed.rules
    });

    importPreview.value = {
      ...mergeResult.summary,
      totalCount: parsed.totalCount,
      parsedCount: parsed.rules.length,
      invalidCount: parsed.invalidCount,
      metadata: parsed.metadata
    };
    importPendingRulesByType.value = mergeResult.rulesByType;
  } catch (error) {
    importPreview.value = null;
    importPendingRulesByType.value = null;
    importParseError.value = error instanceof Error ? error.message : 'Unable to parse import file.';
  } finally {
    isPreparingImportPreview.value = false;
  }
}

async function applyImportRules() {
  if (!canApplyImport.value || isApplyingImport.value) {
    return;
  }

  isApplyingImport.value = true;

  try {
    const nextRulesByType = importPendingRulesByType.value || {};
    localRulesByType.value = {
      groupBy: withRenumberedOrder(
        (nextRulesByType.groupBy || []).map(rule => normalizeLocalRule('groupBy', rule))
      ),
      sort: withRenumberedOrder(
        (nextRulesByType.sort || []).map(rule => normalizeLocalRule('sort', rule))
      ),
      categorize: withRenumberedOrder(
        (nextRulesByType.categorize || []).map(rule => normalizeLocalRule('categorize', rule))
      ),
      filter: withRenumberedOrder(
        (nextRulesByType.filter || []).map(rule => normalizeLocalRule('filter', rule))
      )
    };

    await persistDepthRules();
    const updates = Number(importPreview.value?.updates || 0);
    const creates = Number(importPreview.value?.creates || 0);
    closeImportRulesModal();
    showRuleTransferMessage(`Imported rules (${updates} updated, ${creates} added).`);
  } catch (error) {
    console.error('Error importing rules:', error);
    importParseError.value = error instanceof Error ? error.message : 'Unable to import rules.';
  } finally {
    isApplyingImport.value = false;
  }
}

function toggleAdvancedSection() {
  isAdvancedSectionOpen.value = !isAdvancedSectionOpen.value;
}

async function onRecategorizeBehaviorDecisionChange(nextDecision) {
  const selectedTab = state.selected.tab;
  if (!selectedTab || isSavingRecategorizePreference.value) {
    return;
  }

  const normalizedDecision = normalizeRecategorizeBehaviorDecision(nextDecision);
  if (!normalizedDecision) {
    return;
  }

  const nextHonorPreference = normalizedDecision === 'honor';
  const hasMeaningfulUpdate = recategorizeBehaviorDecision.value !== normalizedDecision;

  if (!hasMeaningfulUpdate) {
    isAdvancedSectionOpen.value = false;
    return;
  }

  isSavingRecategorizePreference.value = true;

  try {
    await updateTabDrillSchemaAtPath(selectedTab._id, state.selected.drillPath, {
      honorRecategorizeAs: nextHonorPreference,
      recategorizeBehaviorDecision: normalizedDecision,
      groupByRules: buildGroupByRulesPayload(normalizedDecision)
    });
    syncLocalRulesFromCurrentDepth();
    isAdvancedSectionOpen.value = false;
  } catch (error) {
    console.error('Error updating recategorize preference:', error);
  } finally {
    isSavingRecategorizePreference.value = false;
  }
}

async function copyCurrentTabSchema() {
  const sourceTab = state.selected.tab;
  if (!sourceTab?._id) {
    return;
  }

  const candidateGroups = state.allUserGroups.filter(group => {
    const groupId = String(group?._id || '');
    return groupId && groupId !== String(state.selected.group?._id || '');
  });

  if (!candidateGroups.length) {
    alert('No other account groups are available for copying.');
    return;
  }

  const menu = candidateGroups
    .map((group, index) => `${index + 1}. ${group.name || group._id}`)
    .join('\n');
  const response = prompt(`Copy schema to which account group?\n${menu}`, '1');

  if (!response) {
    return;
  }

  const byIndex = Number(response);
  let targetGroup = null;
  if (Number.isFinite(byIndex) && byIndex >= 1 && byIndex <= candidateGroups.length) {
    targetGroup = candidateGroups[byIndex - 1];
  } else {
    targetGroup = candidateGroups.find(group =>
      String(group.name || '').toLowerCase() === String(response || '').trim().toLowerCase()
      || String(group._id || '') === String(response || '').trim()
    ) || null;
  }

  if (!targetGroup?._id) {
    alert('Could not find that group.');
    return;
  }

  closeTabActionsMenu();
  const copiedTab = await copyTabSchemaToGroup(sourceTab._id, targetGroup._id || ALL_ACCOUNTS_GROUP_ID);
  if (copiedTab?._id) {
    state.blueBar.message = `Copied schema to ${targetGroup.name || 'target group'}.`;
    state.blueBar.loading = false;
  }
}

async function cleanupRulesAfterTabDelete(tabId) {
  const rulesToUpdate = state.allUserRules.filter(rule =>
    Array.isArray(rule.applyForTabs) && rule.applyForTabs.includes(tabId)
  );

  for (const rule of rulesToUpdate) {
    const applyForTabs = rule.applyForTabs.filter(id => id !== tabId);

    if (!applyForTabs.length) {
      await rulesAPI.deleteRule(rule._id);
      state.allUserRules = state.allUserRules.filter(existingRule => existingRule._id !== rule._id);
      continue;
    }

    const updatedRule = await rulesAPI.updateRule(rule._id, { applyForTabs });
    const updatedRuleIndex = state.allUserRules.findIndex(existingRule => existingRule._id === rule._id);

    if (updatedRuleIndex !== -1) {
      state.allUserRules[updatedRuleIndex] = updatedRule || {
        ...state.allUserRules[updatedRuleIndex],
        applyForTabs
      };
    }
  }
}

async function deleteCurrentTab() {
  if (!state.selected.tab || isDeletingTab.value) return;

  const tabToDelete = state.selected.tab;
  const tabName = tabToDelete.tabName || 'this tab';
  const shouldDelete = confirm(`Delete "${tabName}"? This cannot be undone.`);
  if (!shouldDelete) return;

  isDeletingTab.value = true;
  state.blueBar.message = `Deleting "${tabName}"...`;
  state.blueBar.loading = true;

  try {
    await deleteTabById(tabToDelete._id);
    state.allUserTabs = state.allUserTabs.filter(tab => tab._id !== tabToDelete._id);
    await cleanupRulesAfterTabDelete(tabToDelete._id);

    if (state.selected.tabsForGroup.length > 0) {
      await processAllTabsForSelectedGroup();
    } else {
      state.isLoading = false;
    }

    emit('close');
  } catch (error) {
    console.error('Error deleting tab:', error);
  } finally {
    state.blueBar.loading = false;
    state.blueBar.message = '';
    isDeletingTab.value = false;
  }
}

function normalizeSortPropertyName(rawSortPropertyName) {
  return String(rawSortPropertyName || '').trim().replace(/^-/, '');
}

function normalizeSortDirection(sortDirection, rawSortPropertyName = '') {
  const normalizedSortDirection = String(sortDirection || '').toLowerCase();
  if (normalizedSortDirection === 'asc' || normalizedSortDirection === 'desc') {
    return normalizedSortDirection;
  }

  return String(rawSortPropertyName || '').trim().startsWith('-')
    ? 'desc'
    : 'asc';
}

function isSortPropertyAllowed(sortPropertyName) {
  return SORT_PROPERTY_OPTIONS.some(option => option.value === sortPropertyName);
}

function isSortDirectionAllowed(sortDirection) {
  return SORT_DIRECTION_OPTIONS.some(option => option.value === sortDirection);
}

function getSortDirectionOptions(sortPropertyName) {
  const normalizedSortPropertyName = normalizeSortPropertyName(sortPropertyName);

  if (normalizedSortPropertyName === 'date') {
    return [
      { value: 'desc', label: 'Newest to Oldest' },
      { value: 'asc', label: 'Oldest to Newest' }
    ];
  }

  if (normalizedSortPropertyName === 'amount') {
    return [
      { value: 'desc', label: 'High to Low' },
      { value: 'asc', label: 'Low to High' }
    ];
  }

  if (
    normalizedSortPropertyName === 'name'
    || normalizedSortPropertyName === 'label'
    || normalizedSortPropertyName === 'category'
  ) {
    return [
      { value: 'asc', label: 'A to Z' },
      { value: 'desc', label: 'Z to A' }
    ];
  }

  return [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' }
  ];
}

function normalizeGroupByOptionForUi(rawGroupByOption) {
  const normalizedGroupByOption = String(rawGroupByOption || '').trim();

  if (normalizedGroupByOption === 'day') {
    return 'date';
  }

  if (normalizedGroupByOption === 'month') {
    return 'year_month';
  }

  const allowedGroupByOptions = new Set([
    'none',
    'category',
    'name',
    'label',
    'date',
    'year_month',
    'weekday'
  ]);

  if (!allowedGroupByOptions.has(normalizedGroupByOption)) {
    return 'none';
  }

  return normalizedGroupByOption;
}

function getGroupByButtonStyle(groupByOption) {
  return getSortButtonStyle(groupByOption, selectedGroupByOption.value);
}

function getSortButtonStyle(optionValue, currentValue) {
  const isSelected = currentValue === optionValue;

  if (isSelected) {
    return {
      backgroundColor: 'var(--theme-text)',
      color: 'var(--theme-browser-chrome)',
      borderColor: 'var(--theme-text)'
    };
  }

  return {
    backgroundColor: 'var(--theme-browser-chrome)',
    color: 'var(--theme-text-soft)',
    borderColor: 'var(--theme-border)'
  };
}

async function upsertSingleLocalRule(typeId, ruleArray, options = {}) {
  const normalizedType = sanitizeRuleType(typeId);
  const nextRule = createLocalRule(
    normalizedType,
    normalizedType === 'groupBy'
      ? applyRecategorizeMarkerToGroupByRule({ rule: ruleArray }, recategorizeBehaviorDecision.value).rule
      : ruleArray,
    options
  );
  localRulesByType.value[normalizedType] = withRenumberedOrder([nextRule]);
  await persistDepthRules();
}

async function selectGroupByOption(groupByOption) {
  const normalizedGroupByOption = normalizeGroupByOptionForUi(groupByOption);
  if (isSavingGroupBy.value) {
    return;
  }

  isSavingGroupBy.value = true;
  try {
    await upsertSingleLocalRule('groupBy', ['groupBy', normalizedGroupByOption, '', '', ''], {
      orderOfExecution: 0
    });
  } catch (error) {
    console.error('Error updating group-by rule:', error);
  } finally {
    isSavingGroupBy.value = false;
  }
}

async function onSortPropertyChange(sortPropertyName) {
  const normalizedSortPropertyName = normalizeSortPropertyName(sortPropertyName);
  if (!isSortPropertyAllowed(normalizedSortPropertyName) || isSavingSort.value) {
    return;
  }

  const sortDirectionOptions = getSortDirectionOptions(normalizedSortPropertyName);
  const resolvedSortDirection = sortDirectionOptions.some(option => option.value === selectedSortDirection.value)
    ? selectedSortDirection.value
    : sortDirectionOptions[0]?.value || 'desc';

  isSavingSort.value = true;
  try {
    await upsertSingleLocalRule('sort', [
      'sort',
      normalizedSortPropertyName,
      resolvedSortDirection,
      '',
      ''
    ]);
  } catch (error) {
    console.error('Error updating sort property:', error);
  } finally {
    isSavingSort.value = false;
  }
}

async function onSortDirectionChange(sortDirection) {
  const normalizedSortDirection = normalizeSortDirection(sortDirection, selectedSortProperty.value);
  if (!isSortDirectionAllowed(normalizedSortDirection) || isSavingSort.value) {
    return;
  }

  isSavingSort.value = true;
  try {
    await upsertSingleLocalRule('sort', [
      'sort',
      selectedSortProperty.value,
      normalizedSortDirection,
      '',
      ''
    ]);
  } catch (error) {
    console.error('Error updating sort direction:', error);
  } finally {
    isSavingSort.value = false;
  }
}

function getFilterJoinOperator(rule) {
  return String(rule?.filterJoinOperator || '').toLowerCase() === 'or'
    ? 'or'
    : 'and';
}

async function updateFilterJoinOperator(rule, joinOperator) {
  if (!rule?._id) return;

  const normalizedJoinOperator = joinOperator === 'or' ? 'or' : 'and';
  const currentRules = getEnabledRulesByType('filter').map(cloneRule);
  const ruleIndex = currentRules.findIndex(item => item._id === rule._id);
  if (ruleIndex === -1) {
    return;
  }

  if (getFilterJoinOperator(currentRules[ruleIndex]) === normalizedJoinOperator) {
    return;
  }

  currentRules[ruleIndex].filterJoinOperator = normalizedJoinOperator;
  localRulesByType.value.filter = withRenumberedOrder(currentRules);
  await persistDepthRules();
}

async function onDragEnd(event) {
  const { newIndex, oldIndex, from } = event;
  if (newIndex === oldIndex) return;

  const sectionTypeId = String(from.getAttribute('data-rule-type') || '').trim();

  if (sectionTypeId === 'custom') {
    const customRules = getRulesForSection('custom').map(cloneRule);
    const [removedCustomRule] = customRules.splice(oldIndex, 1);
    customRules.splice(newIndex, 0, removedCustomRule);

    const categorizeRules = getRulesForSection('categorize').map(cloneRule);
    localRulesByType.value.categorize = withRenumberedOrder([
      ...customRules,
      ...categorizeRules
    ]);
    await persistDepthRules();
    return;
  }

  if (sectionTypeId === 'categorize') {
    const customRules = getRulesForSection('custom').map(cloneRule);
    const categorizeRules = getRulesForSection('categorize').map(cloneRule);
    const [removedCategorizeRule] = categorizeRules.splice(oldIndex, 1);
    categorizeRules.splice(newIndex, 0, removedCategorizeRule);

    localRulesByType.value.categorize = withRenumberedOrder([
      ...customRules,
      ...categorizeRules
    ]);
    await persistDepthRules();
    return;
  }

  const ruleTypeId = sanitizeRuleType(sectionTypeId);
  const rules = getEnabledRulesByType(ruleTypeId).map(cloneRule);
  const [removed] = rules.splice(oldIndex, 1);
  rules.splice(newIndex, 0, removed);
  localRulesByType.value[ruleTypeId] = withRenumberedOrder(rules);
  await persistDepthRules();
}

function createNewRuleWithType(typeId) {
  if (typeId === 'custom') {
    return openCustomRuleEditorForm();
  }

  const normalizedType = sanitizeRuleType(typeId);
  const tabId = state.selected.tab?._id;

  currentRule.value = {
    ...createLocalRule(
      normalizedType,
      normalizedType === 'categorize'
        ? ['categorize', '', '', '', 'category', '']
        : [normalizedType, '', '', '', ''],
      {
        orderOfExecution: getEnabledRulesByType(normalizedType).length
      }
    ),
    applyForTabs: tabId ? [tabId] : []
  };
  isNewRule.value = true;
  isCustomRuleEditorMode.value = normalizedType === 'categorize';
  initialMakeGlobalForEditor.value = false;
  showRuleEditModal.value = true;
}

function openCustomRuleEditorForm() {
  const tabId = state.selected.tab?._id;
  currentRule.value = {
    ...createLocalRule('categorize', ['categorize', '', '', '', 'category', ''], {
      orderOfExecution: getEnabledRulesByType('categorize').length
    }),
    applyForTabs: tabId ? [tabId] : []
  };
  isNewRule.value = true;
  isCustomRuleEditorMode.value = true;
  initialMakeGlobalForEditor.value = false;
  showRuleEditModal.value = true;
}

function editRule(rule) {
  currentRule.value = cloneRule(rule);
  isNewRule.value = false;
  isCustomRuleEditorMode.value = String(rule?.rule?.[0] || '').trim().toLowerCase() === 'categorize';
  initialMakeGlobalForEditor.value = Boolean(
    rule?.rule?.[0] === 'categorize' && findGlobalCategorizeRuleById(rule?._id)
  );
  showRuleEditModal.value = true;
}

function showRuleMovedToCustomToast() {
  const toastMessage = 'Rule moved to Custom Rules';
  state.blueBar.loading = false;
  state.blueBar.message = toastMessage;

  setTimeout(() => {
    if (state.blueBar.message === toastMessage && !state.blueBar.loading) {
      state.blueBar.message = '';
    }
  }, 2600);
}

function closeRuleEditModal() {
  showRuleEditModal.value = false;
  currentRule.value = null;
  isCustomRuleEditorMode.value = false;
  initialMakeGlobalForEditor.value = false;
}

async function syncGlobalCategorizeMirror(localCategorizeRule, shouldBeGlobal) {
  if (localCategorizeRule?.rule?.[0] !== 'categorize' || !localCategorizeRule?._id) {
    return false;
  }

  const existingGlobalRule = findGlobalCategorizeRuleById(localCategorizeRule._id);
  const tabId = String(state.selected.tab?._id || '').trim();

  if (!shouldBeGlobal) {
    if (!existingGlobalRule?._id) {
      return false;
    }

    const didDelete = await rulesAPI.deleteRule(existingGlobalRule._id);
    if (!didDelete) {
      return false;
    }

    state.allUserRules = state.allUserRules.filter(rule => rule._id !== existingGlobalRule._id);
    return true;
  }

  const normalizedGlobalRule = {
    _id: String(localCategorizeRule._id || ''),
    rule: Array.isArray(localCategorizeRule.rule)
      ? localCategorizeRule.rule.map(value => String(value ?? ''))
      : ['categorize', '', '', '', ''],
    applyForTabs: tabId ? ['_GLOBAL', tabId] : ['_GLOBAL'],
    filterJoinOperator: String(localCategorizeRule.filterJoinOperator || 'and').toLowerCase() === 'or' ? 'or' : 'and',
    _isImportant: Boolean(localCategorizeRule._isImportant),
    orderOfExecution: existingGlobalRule
      ? safeOrder(existingGlobalRule.orderOfExecution, 0)
      : nextGlobalCategorizeOrder()
  };

  if (existingGlobalRule?._id) {
    const updatedRule = await rulesAPI.updateRule(existingGlobalRule._id, normalizedGlobalRule);
    const existingGlobalRuleIndex = state.allUserRules.findIndex(rule => rule._id === existingGlobalRule._id);
    if (existingGlobalRuleIndex !== -1 && updatedRule) {
      state.allUserRules[existingGlobalRuleIndex] = updatedRule;
    }
    return true;
  }

  const createdRule = await rulesAPI.createRule(normalizedGlobalRule);
  if (createdRule?._id) {
    state.allUserRules.push(createdRule);
    return true;
  }

  return false;
}

async function saveRule(rule) {
  const normalizedType = sanitizeRuleType(rule?.rule?.[0]);
  const existingRules = getEnabledRulesByType(normalizedType).map(cloneRule);
  const normalizedRule = normalizeLocalRule(normalizedType, rule);
  const shouldMakeGlobal = Boolean(rule?._makeGlobal);
  const currentSection = String(props.section || '').trim().toLowerCase();
  const shouldNotifyMovedToCustom = normalizedType === 'categorize'
    && currentSection === 'categorize'
    && resolveCategorizeRuleSetTarget(normalizedRule) !== 'category';

  if (isNewRule.value) {
    existingRules.push(normalizedRule);
  } else {
    const existingIndex = existingRules.findIndex(existingRule => existingRule._id === normalizedRule._id);
    if (existingIndex === -1) {
      existingRules.push(normalizedRule);
    } else {
      existingRules[existingIndex] = normalizedRule;
    }
  }

  localRulesByType.value[normalizedType] = withRenumberedOrder(existingRules);
  await persistDepthRules();
  const didChangeGlobalMirror = await syncGlobalCategorizeMirror(normalizedRule, shouldMakeGlobal);
  if (didChangeGlobalMirror) {
    await processAllTabsForSelectedGroup({ showLoading: false });
  }
  if (shouldNotifyMovedToCustom) {
    showRuleMovedToCustomToast();
  }
  closeRuleEditModal();
}

function toggleRuleContextStatus() {
  // Local depth rules are always active in this editor.
}

function confirmDeleteRule(rule) {
  ruleToDelete.value = rule;
  showDeleteModal.value = true;
}

async function deleteRule() {
  const targetRule = ruleToDelete.value;
  if (!targetRule?._id) {
    return;
  }

  const typeId = sanitizeRuleType(targetRule.rule?.[0]);
  const shouldSyncGlobalMirror = typeId === 'categorize';
  const remainingRules = getEnabledRulesByType(typeId)
    .filter(rule => rule._id !== targetRule._id)
    .map(cloneRule);

  localRulesByType.value[typeId] = withRenumberedOrder(remainingRules);
  await persistDepthRules();
  if (shouldSyncGlobalMirror) {
    const didChangeGlobalMirror = await syncGlobalCategorizeMirror(targetRule, false);
    if (didChangeGlobalMirror) {
      await processAllTabsForSelectedGroup({ showLoading: false });
    }
  }
  showDeleteModal.value = false;
  ruleToDelete.value = null;
}

</script>
