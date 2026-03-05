<template>
  <main :class="['min-h-screen bg-white', footerPaddingClass]">
    <div class="max-w-5xl mx-auto w-full relative">
      <!-- Sticky Navigation Header -->
      <div class="sticky top-0 z-20 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-4 mb-2 transition-all">
        <!-- Left: Dashboard / Reports -->
        <button 
          @click="selectedReport ? backToList() : router.push('/dashboard')" 
          class="flex items-center gap-1.5 hover:opacity-70 transition-opacity group focus:outline-none"
        >
          <ChevronLeft class="w-4 h-4 text-black group-hover:text-black transition-colors" />
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em]">
            {{ selectedReport ? 'Reports' : 'Dashboard' }}
          </span>
        </button>

        <!-- Right: Theme -->
        <div class="flex items-center">
          <ThemeCycleButton />
        </div>
      </div>

      <section class="px-4 py-4">
      <div v-if="state.isLoading" class="py-24 flex justify-center">
        <LoadingDots />
      </div>

      <div v-else-if="state.error" class="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4">
        {{ state.error }}
      </div>

      <template v-else-if="!selectedReport && !hasReports">
        <ReportsEmptyState @create="createFirstReport" />
      </template>

      <template v-else-if="!selectedReport">
        <header class="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 class="text-3xl font-black tracking-tight text-gray-900">Reports</h1>
            <p class="text-sm text-gray-500 mt-1">
              {{ isReorderingReports ? 'Drag reports to rearrange, then tap done.' : 'Tap a report to see all rows and totals.' }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="isReorderingReports"
              class="btn-primary"
              @click="finishReorderReports"
            >
              Done
            </button>

            <div class="relative" data-dropdown-root>
              <button class="p-2 rounded-lg text-gray-500 hover:bg-gray-100" @click="showListMenu = !showListMenu">
                <MoreVertical class="w-5 h-5" />
              </button>

              <div
                v-if="showListMenu"
                data-dropdown-panel
                class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
              >
                <button class="menu-item" @click="toggleReorderReports">
                  {{ isReorderingReports ? 'Stop Rearranging' : 'Rearrange Reports' }}
                </button>
              </div>
            </div>
          </div>
        </header>

        <template v-if="isReorderingReports">
          <draggable
            v-model="reportReorderItems"
            item-key="key"
            class="space-y-1"
            handle=".drag-handle-top"
          >
            <template #item="{ element: item }">
              <article
                v-if="item.type === 'report'"
                class="relative w-full py-4 transition-colors hover:bg-gray-50/50"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-2 min-w-0">
                    <button
                      class="drag-handle-top mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-move"
                      @click.stop
                      title="Drag to reorder"
                    >
                      <GripVertical class="w-4 h-4" />
                    </button>

                    <h2 class="text-xl font-black text-gray-900 truncate uppercase tracking-tight">
                      {{ item.reportName }}
                    </h2>
                  </div>

                  <span class="text-lg font-black" :class="fontColor(getReportTotal(item.reportId))">
                    {{ formatReportTotal(item.reportId, { toFixed: 2 }) }}
                  </span>
                </div>
              </article>

              <section
                v-else
                class="w-full"
              >
                <div class="w-full py-4 flex items-center justify-between gap-3 hover:bg-gray-50/50">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      class="drag-handle-top mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-move"
                      @click.stop
                      title="Drag folder to reorder"
                    >
                      <GripVertical class="w-4 h-4" />
                    </button>

                    <button
                      class="flex items-center gap-2 min-w-0 flex-1 text-left"
                      @click="toggleFolderExpansion(item.folderName)"
                    >
                      <span class="text-lg font-black text-gray-900 truncate uppercase tracking-tight">{{ item.folderName }}</span>
                    </button>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                      @click.stop="toggleFolderExpansion(item.folderName)"
                    >
                      <ChevronUp
                        v-if="folderIsExpanded(item.folderName)"
                        class="w-4 h-4 text-gray-500 flex-shrink-0"
                      />
                      <ChevronDown
                        v-else
                        class="w-4 h-4 text-gray-500 flex-shrink-0"
                      />
                    </button>
                  </div>
                </div>

                <div v-if="folderIsExpanded(item.folderName)" class="pl-6 pb-2">
                  <draggable
                    v-model="item.reports"
                    item-key="key"
                    class="space-y-1"
                    handle=".drag-handle-nested"
                  >
                    <template #item="{ element: folderReport }">
                      <article class="relative w-full py-3 transition-colors hover:bg-gray-50/50">
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex items-start gap-2 min-w-0">
                            <button
                              class="drag-handle-nested mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-move"
                              @click.stop
                              title="Drag to reorder"
                            >
                              <GripVertical class="w-4 h-4" />
                            </button>

                            <h3 class="text-base font-black text-gray-900 truncate uppercase tracking-tight">{{ folderReport.reportName }}</h3>
                          </div>

                          <span class="text-base font-black" :class="fontColor(getReportTotal(folderReport.reportId))">
                            {{ formatReportTotal(folderReport.reportId, { toFixed: 2 }) }}
                          </span>
                        </div>
                      </article>
                    </template>
                  </draggable>
                </div>
              </section>
            </template>
          </draggable>
        </template>

        <template v-else>
          <div class="space-y-1">
            <template v-for="item in topLevelReportItems" :key="item.key">
              <article
                v-if="item.type === 'report'"
                class="relative w-full py-4 transition-colors cursor-pointer hover:bg-gray-50/50"
                @click="openReportFromList(item.report._id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <h2 class="text-lg font-black text-gray-900 truncate uppercase tracking-tight">{{ item.report.name }}</h2>

                  <div class="flex items-center gap-2">
                    <span class="text-lg font-black" :class="fontColor(getReportTotal(item.report._id))">
                      {{ formatReportTotal(item.report._id, { toFixed: 2 }) }}
                    </span>

                    <div class="relative" data-dropdown-root>
                      <button
                        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        @click.stop="toggleReportMenu(item.report._id)"
                      >
                        <MoreVertical class="w-4 h-4" />
                      </button>

                      <div
                        v-if="activeReportMenuId === item.report._id"
                        data-dropdown-panel
                        class="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                        @click.stop
                      >
                        <button class="menu-item" @click="startRenameFromList(item.report)">Edit report name</button>
                        <button class="menu-item" @click="copyReport(item.report._id)">Duplicate</button>
                        <button class="menu-item" @click="openMoveToFolderModal(item.report._id)">{{ folderActionLabel(item.report) }}</button>
                        <button class="menu-item" @click="refreshReportFromList(item.report._id)">Refresh totals</button>
                        <button class="menu-item" @click="confirmDeleteReport(item.report._id)">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <section
                v-else
                class="w-full"
              >
                <div class="w-full py-4 flex items-center justify-between gap-3 hover:bg-gray-50/50">
                  <button
                    class="flex items-center gap-2 min-w-0 flex-1 text-left"
                    @click="toggleFolderExpansion(item.folderName)"
                  >
                    <span class="text-lg font-black text-gray-900 truncate uppercase tracking-tight">{{ item.folderName }}</span>
                  </button>

                  <div class="flex items-center gap-1 ml-2 shrink-0">
                    <div class="relative" data-dropdown-root>
                      <button
                        class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                        @click.stop="toggleFolderMenu(item.folderName)"
                      >
                        <MoreVertical class="w-4 h-4" />
                      </button>

                      <div
                        v-if="activeFolderMenuName === item.folderName"
                        data-dropdown-panel
                        class="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                        @click.stop
                      >
                        <button class="menu-item" @click="renameFolderFromMenu(item.folderName)">Rename folder</button>
                        <button class="menu-item" @click="removeFolderFromMenu(item.folderName)">Remove folder</button>
                      </div>
                    </div>

                    <button
                      class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                      @click.stop="toggleFolderExpansion(item.folderName)"
                    >
                      <ChevronUp
                        v-if="folderIsExpanded(item.folderName)"
                        class="w-4 h-4 text-gray-500 flex-shrink-0"
                      />
                      <ChevronDown
                        v-else
                        class="w-4 h-4 text-gray-500 flex-shrink-0"
                      />
                    </button>
                  </div>
                </div>

                <div v-if="folderIsExpanded(item.folderName)" class="pl-6 pb-2 space-y-1">
                  <article
                    v-for="report in item.reports"
                    :key="report._id"
                    class="relative w-full py-3 transition-colors cursor-pointer hover:bg-gray-50/50"
                    @click="openReportFromList(report._id)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <h3 class="text-base font-black text-gray-900 truncate uppercase tracking-tight">{{ report.name }}</h3>

                      <div class="flex items-center gap-2">
                        <span class="text-base font-black" :class="fontColor(getReportTotal(report._id))">
                          {{ formatReportTotal(report._id, { toFixed: 2 }) }}
                        </span>

                        <div class="relative" data-dropdown-root>
                          <button
                            class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                            @click.stop="toggleReportMenu(report._id)"
                          >
                            <MoreVertical class="w-4 h-4" />
                          </button>

                          <div
                            v-if="activeReportMenuId === report._id"
                            data-dropdown-panel
                            class="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                            @click.stop
                          >
                            <button class="menu-item" @click="startRenameFromList(report)">Edit report name</button>
                            <button class="menu-item" @click="copyReport(report._id)">Duplicate</button>
                            <button class="menu-item" @click="openMoveToFolderModal(report._id)">{{ folderActionLabel(report) }}</button>
                            <button class="menu-item" @click="refreshReportFromList(report._id)">Refresh totals</button>
                            <button class="menu-item" @click="confirmDeleteReport(report._id)">Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </template>
          </div>
        </template>
      </template>

      <template v-else>
        <header class="mb-6 flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="min-w-0 flex-1">
              <div v-if="isEditingReportName" class="space-y-2">
                <input
                  v-model="reportNameDraft"
                  class="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-lg font-black"
                />
                <div class="flex items-center gap-2">
                  <button class="btn-primary" @click="saveReportName">Save</button>
                  <button class="btn-secondary" @click="cancelReportNameEdit">Cancel</button>
                </div>
              </div>
              <template v-else>
                <h1 class="text-3xl font-black uppercase tracking-tight text-gray-900 truncate">{{ selectedReport.name }}</h1>
                <p class="text-xs text-gray-500 mt-1">
                  {{ selectedReport.rows.length }} row{{ selectedReport.rows.length === 1 ? '' : 's' }}
                  <span v-if="isDraftSelected" class="ml-2 text-amber-700 font-bold">· Unsaved</span>
                  <span v-else-if="saveStateLabel" class="ml-2">· {{ saveStateLabel }}</span>
                </p>
              </template>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <template v-if="isDraftSelected">
              <button class="btn-secondary" @click="cancelDraftAndBack">Cancel</button>
              <button class="btn-primary" @click="saveDraftReport">Save</button>
            </template>

            <button
              v-if="isReorderingRows && !isDraftSelected"
              class="btn-primary"
              @click="finishReorderRows"
            >
              Done
            </button>

            <div class="relative" data-dropdown-root>
              <button class="p-2 rounded-lg text-gray-500 hover:bg-gray-100" @click="showDetailReportMenu = !showDetailReportMenu">
                <MoreVertical class="w-5 h-5" />
              </button>

              <div
                v-if="showDetailReportMenu"
                data-dropdown-panel
                class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                @click.stop
              >
                <button class="menu-item" @click="startReportNameEdit">Edit report name</button>
                <button class="menu-item" @click="copyReport(selectedReport._id)">Duplicate</button>
                <button class="menu-item" @click="refreshSelectedReport">Refresh totals</button>
                <button class="menu-item" @click="toggleReorderRows">
                  {{ isReorderingRows ? 'Stop Rearranging Rows' : 'Rearrange Rows' }}
                </button>
                <button class="menu-item" @click="confirmDeleteReport(selectedReport._id)">Delete</button>
              </div>
            </div>
          </div>
        </header>

        <div class="space-y-3 pb-20">
          <p v-if="isReorderingRows" class="text-xs text-gray-500 px-1">
            Drag rows to rearrange order, then tap done.
          </p>

          <draggable
            v-model="rowsForDrag"
            item-key="rowId"
            class="space-y-3"
            handle=".drag-handle"
            :disabled="!isReorderingRows"
            @end="onRowsDragEnd"
          >
            <template #item="{ element: row, index }">
              <article
                class="relative border rounded-xl px-4 py-3 bg-white"
                :class="[
                  isReorderingRows ? 'border-dashed border-gray-300' : 'border-gray-200'
                ]"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex items-start gap-2">
                    <button
                      v-if="isReorderingRows"
                      class="drag-handle mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-move"
                      @click.stop
                      title="Drag to reorder"
                    >
                      <GripVertical class="w-4 h-4" />
                    </button>

                    <div class="min-w-0">
                      <div class="flex items-center gap-2 min-w-0">
                        <span
                          v-if="showRowReferenceBadges"
                          class="flex-shrink-0 inline-flex items-center rounded-md border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gray-600"
                        >
                          r{{ index + 1 }}
                        </span>
                        <div class="text-lg font-bold text-gray-900 truncate uppercase">
                          {{ rowTitle(row) }}
                        </div>
                      </div>
                      <p class="text-sm text-gray-500 mt-1">
                        {{ rowSubtitle(row) }}
                      </p>
                      <p v-if="getRowIssue(selectedReport._id, row.rowId)" class="text-xs text-red-600 mt-1">
                        {{ getRowIssue(selectedReport._id, row.rowId) }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-xl font-black" :class="fontColor(getRowAmount(selectedReport._id, row.rowId))">
                      {{ formatRowAmount(selectedReport._id, row, { toFixed: 2 }) }}
                    </span>

                    <div v-if="!isReorderingRows" class="relative" data-dropdown-root>
                      <button class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" @click.stop="toggleRowMenu(row.rowId)">
                        <MoreVertical class="w-4 h-4" />
                      </button>

                      <div
                        v-if="activeRowMenuId === row.rowId"
                        data-dropdown-panel
                        class="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20"
                        @click.stop
                      >
                        <button v-if="row.type === 'tab'" class="menu-item" @click="openDashboardFromRow(row)">View In Dashboard</button>
                        <button class="menu-item" @click="startRowEdit(row)">Edit</button>
                        <button class="menu-item" @click="deleteRowAndSave(row.rowId)">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </template>
          </draggable>

          <div v-if="!selectedReport.rows.length" class="text-center text-sm text-gray-500 italic py-10">
            No rows yet. Add a row below.
          </div>

          <div class="pt-2 relative" data-dropdown-root>
            <button
              :disabled="isReorderingRows"
              class="w-full border border-gray-300 rounded-xl py-3 text-sm font-black text-gray-800 hover:bg-gray-50"
              :class="isReorderingRows ? 'opacity-50 cursor-not-allowed' : ''"
              @click="showAddRowPicker = !showAddRowPicker"
            >
              Add Row
            </button>

            <div
              v-if="showAddRowPicker"
              data-dropdown-panel
              class="mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
            >
              <button class="menu-item" @click="addAndEditRow('tab')">Select Existing Tab</button>
              <button
                class="menu-item disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!hasSelectableLinkedReports"
                @click="addAndEditRow('report')"
              >
                Select Existing Report
              </button>
              <button
                class="menu-item disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!hasExistingRows"
                @click="openExistingRowPickerModal"
              >
                Select Existing Row
              </button>
              <button class="menu-item" @click="addAndEditRow('manual')">Manually Enter Amount</button>
            </div>
          </div>
        </div>

      </template>

      <div class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-30">
        <div class="max-w-5xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <div v-if="selectedReport" class="flex-1 min-w-0">
            <div class="flex items-center gap-3 min-w-0">
              <button
                class="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                @click="openFormulaMenuModal"
              >
                <MoreVertical class="w-4 h-4" />
              </button>
              <span class="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Total</span>
              <span class="text-xl font-black truncate" :class="fontColor(getReportTotal(selectedReport._id))">
                {{ formatReportTotal(selectedReport._id, { toFixed: 2 }) }}
              </span>
            </div>

            <div
              v-if="isFormulaMenuModalOpen"
              class="mt-3 w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-sm p-3"
            >
              <button
                class="w-full text-left border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"
                @click="openFormulaEditorModal"
              >
                Edit Formula
              </button>
              <div class="mt-2 flex justify-end">
                <button
                  class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isApplyingReportFormula"
                  @click="closeFormulaModals"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
          <div v-else class="flex-1">
            <button
              class="group focus:outline-none inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isReorderingReports"
              @click="openCreateReportModal"
            >
              <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em]">
                Create Report
              </span>
            </button>
          </div>

          <button
            @click="isAccountModalOpen = true"
            class="flex items-center gap-1.5 hover:opacity-70 transition-opacity group focus:outline-none flex-shrink-0"
          >
            <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em]">
              Account
            </span>
            <ChevronRight class="w-3.5 h-3.5 text-black group-hover:text-black transition-colors" />
          </button>
        </div>
      </div>

      <AccountModal
        :is-open="isAccountModalOpen"
        @close="isAccountModalOpen = false"
      />

      <div
        v-if="isFormulaEditorModalOpen"
        class="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
      >
        <div class="pointer-events-auto w-full bg-white rounded-t-[1.75rem] border border-gray-200 border-b-0 shadow-2xl px-5 py-6 md:px-8 md:py-8 max-h-[75vh] overflow-y-auto">
          <h2 class="text-xl font-black text-gray-900">Edit Formula</h2>

          <div class="mt-4 space-y-4">
            <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
              Format
              <select
                v-model="totalDisplayTypeDraft"
                class="mt-1 w-full sm:w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="dollar">Dollar</option>
                <option value="percentage">Percentage</option>
              </select>
            </label>

            <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
              Custom Formula
              <input
                v-model="totalFormulaDraft"
                type="text"
                class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="r1-r2+r3*1.0875"
                @keydown.enter.prevent="applyReportFormula"
              />
            </label>

            <p class="text-xs text-gray-500">
              Supports rN row refs, numbers, + - * /, parentheses, and unary +/-.
            </p>
            <p v-if="selectedReportTotalIssue" class="text-xs text-red-600">
              Formula issue: {{ selectedReportTotalIssue }}. Showing default sum.
            </p>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isApplyingReportFormula"
              @click="closeFormulaModals"
            >
              Close
            </button>
            <button
              class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isApplyingReportFormula"
              @click="clearReportFormula"
            >
              Clear
            </button>
            <button
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isApplyingReportFormula"
              @click="applyReportFormula"
            >
              {{ isApplyingReportFormula ? 'Applying...' : 'Apply' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="isExistingRowPickerModalOpen"
        class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="closeExistingRowPickerModal"
      >
        <div class="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-2xl p-5">
          <h2 class="text-lg font-black text-gray-900">Select Existing Row</h2>

          <div class="mt-4 border border-gray-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
            <template v-if="hasExistingRows">
              <button
                v-for="option in existingRowOptions"
                :key="option.key"
                class="menu-item border-b border-gray-100 last:border-b-0"
                @click="addExistingRowFromOption(option.key)"
              >
                {{ option.label }}
              </button>
            </template>
            <p v-else class="px-4 py-3 text-sm text-gray-500">
              No rows available.
            </p>
          </div>

          <div class="mt-4 flex justify-end">
            <button class="btn-secondary" @click="closeExistingRowPickerModal">Cancel</button>
          </div>
        </div>
      </div>

      <div
        v-if="isCreateReportModalOpen"
        class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="cancelCreateReport"
      >
        <div class="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-5">
          <h2 class="text-lg font-black text-gray-900">What do you want to call this report?</h2>

          <label class="block mt-4 text-xs font-black uppercase tracking-wider text-gray-500">
            Report Name
            <input
              v-model="createReportNameDraft"
              class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Monthly Budget"
              @keydown.enter.prevent="confirmCreateReport"
            />
          </label>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button class="btn-secondary" @click="cancelCreateReport">Cancel</button>
            <button
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canCreateReport || isCreatingReport"
              @click="confirmCreateReport"
            >
              {{ isCreatingReport ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="isMoveToFolderModalOpen"
        class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="closeMoveToFolderModal"
      >
        <div class="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-5">
          <h2 class="text-lg font-black text-gray-900">Move To Folder</h2>

          <label class="block mt-4 text-xs font-black uppercase tracking-wider text-gray-500">
            Existing Folders
            <select
              v-model="selectedFolderOption"
              class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a folder</option>
              <option v-for="folderName in existingFolderOptions" :key="folderName" :value="folderName">
                {{ folderName }}
              </option>
            </select>
          </label>

          <div class="mt-4 border-t border-gray-100 pt-4">
            <template v-if="!isCreatingNewFolder">
              <button class="btn-secondary w-full" @click="startCreatingFolder">
                New Folder
              </button>
            </template>
            <template v-else>
              <div class="flex items-center gap-2">
                <input
                  v-model="newFolderNameDraft"
                  class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Folder name"
                  @keydown.enter.prevent="createFolderAndMove"
                />
                <button
                  class="h-10 w-10 rounded-lg bg-black text-white flex items-center justify-center disabled:opacity-50"
                  :disabled="!newFolderNameDraft.trim() || isMovingReportToFolder"
                  @click="createFolderAndMove"
                >
                  <Check class="w-4 h-4" />
                </button>
              </div>
            </template>
          </div>

          <div class="mt-5 flex items-center justify-between gap-2">
            <button
              v-if="reportBeingMovedIsInFolder"
              class="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
              :disabled="isMovingReportToFolder"
              @click="removeFromFolderInModal"
            >
              Remove from folder
            </button>
            <div v-else></div>

            <div class="flex items-center gap-2">
              <button class="btn-secondary" :disabled="isMovingReportToFolder" @click="closeMoveToFolderModal">
                Cancel
              </button>
              <button
                class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!selectedFolderOption.trim() || isMovingReportToFolder"
                @click="moveToSelectedFolder"
              >
                {{ isMovingReportToFolder ? 'Saving...' : 'Move' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isRowEditorOpen && rowEditorDraft"
        :class="isManualRowEditor
          ? 'fixed inset-x-0 bottom-0 z-40 pointer-events-none'
          : 'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center p-4'"
        @click.self="onRowEditorBackdropClick"
      >
        <div
          :class="isManualRowEditor
            ? 'pointer-events-auto w-full bg-white rounded-t-[1.75rem] border border-gray-200 border-b-0 shadow-2xl px-5 py-6 md:px-8 md:py-8 max-h-[75vh] overflow-y-auto'
            : 'w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 md:p-6'"
        >
          <h2 class="text-xl font-black text-gray-900">Edit Row</h2>

          <div class="mt-4 space-y-4">
            <template v-if="rowEditorDraft.type === 'tab'">
              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Tab
                <select v-model="rowEditorDraft.tabId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select tab</option>
                  <option v-for="tab in sortedTabs" :key="tab._id" :value="tab._id">{{ tab.tabName }}</option>
                </select>
              </label>

              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Group / Account
                <select v-model="rowEditorDraft.groupId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select group / account</option>
                  <option
                    v-for="option in groupAccountOptions"
                    :key="option.id"
                    :value="option.id"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                  Start
                  <input type="date" v-model="rowEditorDraft.dateStart" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
                <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                  End
                  <input type="date" v-model="rowEditorDraft.dateEnd" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </label>
              </div>

              <div class="mt-4">
                <div class="text-[10px] font-black tracking-widest text-gray-400 uppercase mb-3 px-2">Quick Select</div>
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent" 
                    @click="applyQuickSelect('today')"
                  >
                    Today
                  </button>
                  <button 
                    class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent" 
                    @click="applyQuickSelect('prevMonth')"
                  >
                    Prev Month
                  </button>
                  <button 
                    class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent" 
                    @click="applyQuickSelect('nextMonth')"
                  >
                    Next Month
                  </button>
                  <button 
                    class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent" 
                    @click="applyQuickSelect('prevYear')"
                  >
                    Prev Year
                  </button>
                  <button 
                    class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent" 
                    @click="applyQuickSelect('nextYear')"
                  >
                    Next Year
                  </button>
                  <button 
                    class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent" 
                    @click="applyQuickSelect('last30Days')"
                  >
                    Last 30
                  </button>
                  <button 
                    class="px-6 py-4 bg-gray-100 hover:bg-black text-gray-800 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border-2 border-transparent" 
                    @click="applyQuickSelect('last90Days')"
                  >
                    Last 90
                  </button>
                </div>
              </div>
            </template>

            <template v-else-if="rowEditorDraft.type === 'report'">
              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Existing Report
                <select v-model="rowEditorDraft.reportId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select report</option>
                  <option
                    v-for="report in selectableLinkedReports"
                    :key="report._id"
                    :value="report._id"
                  >
                    {{ linkedReportOptionLabel(report) }}
                  </option>
                </select>
              </label>

              <p class="text-xs text-gray-500">
                This row will save the selected report’s current total when you save.
              </p>
            </template>

            <template v-else>
              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Title
                <input v-model="rowEditorDraft.title" type="text" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>

              <label class="block text-xs font-black uppercase tracking-wider text-gray-500">
                Value
                <input
                  v-model="rowEditorDraft.amountInput"
                  type="text"
                  class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="123.45 or =r1-r2+r3*1.0875"
                />
              </label>

              <label
                v-if="isRowEditorManualFormula"
                class="block text-xs font-black uppercase tracking-wider text-gray-500"
              >
                Format
                <select
                  v-model="rowEditorDraft.amountDisplayType"
                  class="mt-1 w-full sm:w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="dollar">Price</option>
                  <option value="percentage">Percentage</option>
                  <option value="none">None</option>
                </select>
              </label>

              <p class="text-xs text-gray-500">
                Start with <code>=</code> to use a formula with PEMDAS and rN row refs.
              </p>
            </template>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isSavingRow"
              @click="cancelRowEditor"
            >
              Cancel
            </button>
            <button
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isSavingRow"
              @click="saveRowEditor"
            >
              {{ isSavingRow ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format as formatDate,
  isSameMonth,
  isSameYear,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears
} from 'date-fns';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, MoreVertical } from 'lucide-vue-next';
import draggable from 'vuedraggable';
import { useRouter } from 'vue-router';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import ThemeCycleButton from '@/shared/components/ThemeCycleButton.vue';
import AccountModal from '@/shared/components/AccountModal.vue';
import ReportsEmptyState from '@/features/reports/components/ReportsEmptyState.vue';
import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';
import { normalizeManualAmountDisplayType, useReportsState } from '@/features/reports/composables/useReportsState.js';
import { useUtils } from '@/shared/composables/useUtils.js';

const router = useRouter();
const {
  state,
  sortedTabs,
  sortedGroups,
  hasReports,
  isDraftReport,
  initReports,
  createReport,
  duplicateReport,
  cancelDraftReport,
  deleteReport,
  saveReport,
  updateReportName,
  updateReportTotalFormula,
  updateReportTotalDisplayType,
  moveReportToFolder,
  removeReportFromFolder,
  renameFolder,
  removeFolder,
  addTabRow,
  addManualRow,
  addReportRow,
  updateRow,
  removeRow,
  reorderRows,
  reorderReports,
  saveReportLayout,
  saveReportsOrder,
  refreshRowTotal,
  getRowAmount,
  getRowIssue,
  getReportTotal,
  getReportTotalIssue,
  refreshReportTotals
} = useReportsState();

const { formatPrice, fontColor } = useUtils();

const selectedReportId = ref('');
const activeReportMenuId = ref('');
const activeFolderMenuName = ref('');
const activeRowMenuId = ref('');
const showAddRowPicker = ref(false);
const isExistingRowPickerModalOpen = ref(false);
const showListMenu = ref(false);

const showDetailReportMenu = ref(false);
const isEditingReportName = ref(false);
const reportNameDraft = ref('');
const totalFormulaDraft = ref('');
const totalDisplayTypeDraft = ref('dollar');
const isApplyingReportFormula = ref(false);
const isFormulaMenuModalOpen = ref(false);
const isFormulaEditorModalOpen = ref(false);

const isRowEditorOpen = ref(false);
const rowEditorDraft = ref(null);
const editingRowId = ref('');
const editingRowWasNew = ref(false);
const isSavingRow = ref(false);
const isCreateReportModalOpen = ref(false);
const createReportNameDraft = ref('');
const isCreatingReport = ref(false);
const isAccountModalOpen = ref(false);
const duplicatingReportId = ref('');
const isMoveToFolderModalOpen = ref(false);
const moveToFolderReportId = ref('');
const selectedFolderOption = ref('');
const isCreatingNewFolder = ref(false);
const newFolderNameDraft = ref('');
const isMovingReportToFolder = ref(false);
const expandedFoldersByName = ref({});
const reportReorderItems = ref([]);
const isReorderingReports = ref(false);
const isReorderingRows = ref(false);

const selectedReport = computed(() =>
  state.reports.find(report => report._id === selectedReportId.value) || null
);
const isManualRowEditor = computed(() =>
  rowEditorDraft.value?.type === 'manual'
);
const showRowReferenceBadges = computed(() =>
  isFormulaEditorModalOpen.value || isManualRowEditor.value
);
const isRowEditorManualFormula = computed(() =>
  rowEditorDraft.value?.type === 'manual'
  && String(rowEditorDraft.value?.amountInput || '').trim().startsWith('=')
);

function sanitizeLabelText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\uFFFD+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function accountIdentifiers(account) {
  if (!account) return [];
  if (typeof account === 'string') return [account];

  return [account._id, account.account_id].filter(Boolean);
}

function accountsMatch(accountA, accountB) {
  const idsA = accountIdentifiers(accountA);
  const idsB = new Set(accountIdentifiers(accountB));

  return idsA.some(id => idsB.has(id));
}

function isLabelGroup(group) {
  const accounts = Array.isArray(group?.accounts) ? group.accounts : [];

  if (typeof group?.isLabel === 'boolean') {
    return group.isLabel;
  }

  return accounts.length > 1;
}

function accountOptionLabel(account, fallbackName = '') {
  const officialName = sanitizeLabelText(account?.official_name || account?.officialName || '');
  const accountName = sanitizeLabelText(account?.name || '');
  const fallback = sanitizeLabelText(fallbackName || '');
  const mask = account?.mask !== undefined && account?.mask !== null
    ? sanitizeLabelText(String(account.mask))
    : '';
  const base = officialName || accountName || fallback || (mask ? `Account ${mask}` : 'Account');

  if (mask && !base.toLowerCase().includes(mask.toLowerCase())) {
    return `${base} (${mask})`;
  }

  return base;
}

const groupAccountOptions = computed(() => {
  const labelGroupOptions = [];
  const accountGroupCandidates = [];
  const accountOptions = [];
  const usedAccountGroupIds = new Set();

  sortedGroups.value.forEach((group) => {
    const groupId = String(group?._id || '');
    if (!groupId || groupId === ALL_ACCOUNTS_GROUP_ID) {
      return;
    }

    const groupName = sanitizeLabelText(group?.name || '') || 'Unnamed Group';
    if (isLabelGroup(group)) {
      labelGroupOptions.push({
        id: groupId,
        label: groupName
      });
      return;
    }

    accountGroupCandidates.push(group);
  });

  state.allUserAccounts.forEach((account) => {
    const matchingAccountGroup = accountGroupCandidates.find((group) => {
      const groupId = String(group?._id || '');
      if (!groupId || usedAccountGroupIds.has(groupId)) {
        return false;
      }

      const groupAccounts = Array.isArray(group?.accounts) ? group.accounts : [];
      return groupAccounts.some(groupAccount => accountsMatch(groupAccount, account));
    });

    if (!matchingAccountGroup?._id) {
      return;
    }

    usedAccountGroupIds.add(matchingAccountGroup._id);
    accountOptions.push({
      id: matchingAccountGroup._id,
      label: accountOptionLabel(account, matchingAccountGroup.name)
    });
  });

  accountGroupCandidates.forEach((group) => {
    const groupId = String(group?._id || '');
    if (!groupId || usedAccountGroupIds.has(groupId)) {
      return;
    }

    usedAccountGroupIds.add(groupId);
    const account = Array.isArray(group?.accounts) ? group.accounts[0] : null;
    accountOptions.push({
      id: groupId,
      label: accountOptionLabel(account, group.name)
    });
  });

  labelGroupOptions.sort((a, b) => a.label.localeCompare(b.label));
  accountOptions.sort((a, b) => a.label.localeCompare(b.label));

  return [
    {
      id: ALL_ACCOUNTS_GROUP_ID,
      label: 'All Accounts'
    },
    ...labelGroupOptions,
    ...accountOptions
  ];
});

const groupAccountLabelById = computed(() => {
  const labels = new Map();

  groupAccountOptions.value.forEach((option) => {
    labels.set(option.id, option.label);
  });

  sortedGroups.value.forEach((group) => {
    const groupId = String(group?._id || '');
    if (!groupId || labels.has(groupId)) {
      return;
    }

    labels.set(groupId, sanitizeLabelText(group?.name || '') || 'Unnamed Group');
  });

  return labels;
});

const isDraftSelected = computed(() => isDraftReport(selectedReport.value));
const canCreateReport = computed(() => Boolean(createReportNameDraft.value.trim()));
const selectableLinkedReports = computed(() => {
  if (!selectedReport.value?._id) {
    return [];
  }

  return [...state.reports]
    .filter(report => report?._id && report._id !== selectedReport.value._id)
    .sort((a, b) => {
      const folderA = String(a.folderName || '').trim();
      const folderB = String(b.folderName || '').trim();

      if (folderA !== folderB) {
        return folderA.localeCompare(folderB);
      }

      return String(a.name || '').localeCompare(String(b.name || ''));
    });
});
const hasSelectableLinkedReports = computed(() => selectableLinkedReports.value.length > 0);
const existingRowOptions = computed(() => {
  const options = [];

  sortedReports.value.forEach((report) => {
    (Array.isArray(report?.rows) ? report.rows : []).forEach((row) => {
      if (!row?.rowId || typeof row.rowId !== 'string') {
        return;
      }

      options.push({
        key: `${report._id}::${row.rowId}`,
        label: existingRowBreadcrumbLabel(report, row)
      });
    });
  });

  return options;
});
const hasExistingRows = computed(() => existingRowOptions.value.length > 0);
const sortedReports = computed(() =>
  [...state.reports].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
);
const folderGroups = computed(() => {
  const grouped = new Map();

  sortedReports.value.forEach((report) => {
    const folderName = String(report?.folderName || '').trim();
    if (!folderName) return;

    if (!grouped.has(folderName)) {
      grouped.set(folderName, []);
    }

    grouped.get(folderName).push(report);
  });

  return [...grouped.entries()].map(([name, reports]) => ({
    name,
    reports
  }));
});
const folderGroupsByName = computed(() => {
  const map = new Map();
  folderGroups.value.forEach((group) => {
    map.set(group.name, group);
  });
  return map;
});
const topLevelReportItems = computed(() => {
  const seenFolders = new Set();
  const items = [];

  sortedReports.value.forEach((report) => {
    const folderName = String(report?.folderName || '').trim();

    if (!folderName) {
      items.push({
        key: `report:${report._id}`,
        type: 'report',
        report
      });
      return;
    }

    if (seenFolders.has(folderName)) {
      return;
    }

    seenFolders.add(folderName);
    items.push({
      key: `folder:${folderName}`,
      type: 'folder',
      folderName,
      reports: folderGroupsByName.value.get(folderName)?.reports || []
    });
  });

  return items;
});
const existingFolderOptions = computed(() => folderGroups.value.map(group => group.name));
const reportBeingMoved = computed(() =>
  state.reports.find(report => report._id === moveToFolderReportId.value) || null
);
const reportBeingMovedIsInFolder = computed(() =>
  Boolean(String(reportBeingMoved.value?.folderName || '').trim())
);

const rowsForDrag = computed({
  get() {
    if (!selectedReport.value) return [];
    return [...selectedReport.value.rows].sort((a, b) => a.sort - b.sort);
  },
  set(nextRows) {
    if (!selectedReport.value) return;
    reorderRows(selectedReport.value._id, nextRows);
  }
});

const saveStateLabel = computed(() => {
  if (!selectedReport.value) return '';

  const status = state.saveStatusByReportId[selectedReport.value._id];
  if (status === 'refreshing') return 'Refreshing totals...';
  if (status === 'saving') return 'Saving...';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return 'Save failed';
  return '';
});

const footerPaddingClass = computed(() => {
  if (isManualRowEditor.value) {
    return 'pb-[30rem]';
  }

  if (isFormulaEditorModalOpen.value) {
    return 'pb-[30rem]';
  }

  if (isFormulaMenuModalOpen.value) {
    return 'pb-40';
  }

  return 'pb-28';
});

const selectedReportTotalIssue = computed(() => {
  if (!selectedReport.value?._id) return '';
  return getReportTotalIssue(selectedReport.value._id);
});

watch(
  () => selectedReport.value?._id || '',
  () => {
    totalFormulaDraft.value = selectedReport.value?.totalFormula || '';
    totalDisplayTypeDraft.value = selectedReport.value?.totalDisplayType || 'dollar';
    isFormulaMenuModalOpen.value = false;
    isFormulaEditorModalOpen.value = false;
  },
  { immediate: true }
);

function getReportDisplayType(reportId) {
  const report = state.reports.find(item => item._id === reportId);
  return String(report?.totalDisplayType || '').trim().toLowerCase() === 'percentage'
    ? 'percentage'
    : 'dollar';
}

function formatPercentage(value, { toFixed = 2 } = {}) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;

  return safeValue.toLocaleString('en-US', {
    style: 'percent',
    minimumFractionDigits: toFixed,
    maximumFractionDigits: toFixed
  });
}

function formatReportTotal(reportId, { toFixed = 2 } = {}) {
  const total = getReportTotal(reportId);
  const displayType = getReportDisplayType(reportId);

  if (displayType === 'percentage') {
    return formatPercentage(total, { toFixed });
  }

  return formatPrice(total, { toFixed });
}

function formatPlainNumber(value, { toFixed = 2 } = {}) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;

  return safeValue.toLocaleString('en-US', {
    minimumFractionDigits: toFixed,
    maximumFractionDigits: toFixed
  });
}

function hasManualRowFormula(row) {
  return row?.type === 'manual' && Boolean(String(row?.amountFormula || '').trim());
}

function formatRowAmount(reportId, row, { toFixed = 2 } = {}) {
  const amount = getRowAmount(reportId, row?.rowId);

  if (hasManualRowFormula(row)) {
    const displayType = normalizeManualAmountDisplayType(row?.amountDisplayType);
    if (displayType === 'percentage') {
      return formatPercentage(amount, { toFixed });
    }

    if (displayType === 'none') {
      return formatPlainNumber(amount, { toFixed });
    }
  }

  return formatPrice(amount, { toFixed });
}

function folderIsExpanded(folderName) {
  return expandedFoldersByName.value[folderName] === true;
}

function toggleFolderExpansion(folderName) {
  expandedFoldersByName.value[folderName] = !folderIsExpanded(folderName);
}

function ensureFolderExpanded(folderName) {
  if (!folderName) return;
  expandedFoldersByName.value[folderName] = true;
}

function linkedReportOptionLabel(report) {
  const reportName = String(report?.name || '').trim() || 'Untitled report';
  const folderName = String(report?.folderName || '').trim();
  if (!folderName) {
    return reportName;
  }

  return `${folderName} / ${reportName}`;
}

function buildReportReorderItems() {
  const folderReports = new Map();
  sortedReports.value.forEach((report) => {
    const folderName = String(report?.folderName || '').trim();
    if (!folderName) return;

    if (!folderReports.has(folderName)) {
      folderReports.set(folderName, []);
    }

    folderReports.get(folderName).push({
      key: `report:${report._id}`,
      type: 'report',
      reportId: report._id,
      reportName: report.name || 'Untitled report'
    });
  });

  const seenFolders = new Set();
  const items = [];

  sortedReports.value.forEach((report) => {
    const folderName = String(report?.folderName || '').trim();

    if (!folderName) {
      items.push({
        key: `report:${report._id}`,
        type: 'report',
        reportId: report._id,
        reportName: report.name || 'Untitled report'
      });
      return;
    }

    if (seenFolders.has(folderName)) {
      return;
    }

    seenFolders.add(folderName);
    items.push({
      key: `folder:${folderName}`,
      type: 'folder',
      folderName,
      reports: folderReports.get(folderName) || []
    });
  });

  return items;
}

function applyReportReorderItems() {
  if (!reportReorderItems.value.length) {
    return;
  }

  const sorted = [...sortedReports.value];
  const reportById = new Map(sorted.map(report => [report._id, report]));
  const folderReports = new Map();

  sorted.forEach((report) => {
    const folderName = String(report?.folderName || '').trim();
    if (!folderName) return;

    if (!folderReports.has(folderName)) {
      folderReports.set(folderName, []);
    }

    folderReports.get(folderName).push(report);
  });

  const nextReports = [];
  const addedReportIds = new Set();

  reportReorderItems.value.forEach((item) => {
    if (item.type === 'report') {
      const report = reportById.get(item.reportId);
      if (report && !addedReportIds.has(report._id)) {
        nextReports.push(report);
        addedReportIds.add(report._id);
      }
      return;
    }

    const groupedReports = folderReports.get(item.folderName) || [];
    const reorderedFolderItems = Array.isArray(item.reports) ? item.reports : [];
    const groupedReportsById = new Map(groupedReports.map(report => [report._id, report]));

    reorderedFolderItems.forEach((folderReportItem) => {
      const report = reportById.get(folderReportItem.reportId) || groupedReportsById.get(folderReportItem.reportId);
      if (report && !addedReportIds.has(report._id)) {
        nextReports.push(report);
        addedReportIds.add(report._id);
      }
    });

    groupedReports.forEach((report) => {
      if (!addedReportIds.has(report._id)) {
        nextReports.push(report);
        addedReportIds.add(report._id);
      }
    });
  });

  sorted.forEach((report) => {
    if (!addedReportIds.has(report._id)) {
      nextReports.push(report);
      addedReportIds.add(report._id);
    }
  });

  reorderReports(nextReports);
}

function tabName(tabId) {
  return sortedTabs.value.find(tab => tab._id === tabId)?.tabName || 'Tab not found';
}

function groupName(groupId) {
  return groupAccountLabelById.value.get(groupId) || 'Group / account not found';
}

function rowTitle(row) {
  if (row.type === 'manual') {
    return row.title || 'Untitled manual row';
  }

  if (row.type === 'report') {
    const linkedReport = state.reports.find(report => report._id === row.reportId);
    return linkedReport?.name || row.reportName || 'Report not found';
  }

  return tabName(row.tabId);
}

function rowSubtitle(row) {
  if (row.type === 'manual') {
    return 'Manual row';
  }

  if (row.type === 'report') {
    return 'Existing report row';
  }

  return `${groupName(row.groupId)} · ${row.dateStart || '—'} to ${row.dateEnd || '—'}`;
}

function existingRowTypeLabel(row) {
  if (row?.type === 'tab') {
    return 'Tab';
  }

  if (row?.type === 'report') {
    return 'Report';
  }

  return 'Manual';
}

function existingRowBreadcrumbLabel(report, row) {
  const folderName = String(report?.folderName || '').trim();
  const reportName = String(report?.name || '').trim() || 'Untitled report';
  const typeLabel = existingRowTypeLabel(row);
  const rowName = rowTitle(row);

  const parts = [];
  if (folderName) {
    parts.push(folderName);
  }

  parts.push(reportName, typeLabel, rowName);
  return parts.join(' / ');
}

function findExistingRowOption(optionKey) {
  const [reportId, rowId] = String(optionKey || '').split('::');
  if (!reportId || !rowId) {
    return null;
  }

  const report = state.reports.find(item => item._id === reportId);
  if (!report) {
    return null;
  }

  const row = report.rows.find(item => item.rowId === rowId);
  if (!row) {
    return null;
  }

  return { report, row };
}

function createRowByType(reportId, type) {
  if (type === 'tab') {
    return addTabRow(reportId);
  }

  if (type === 'report') {
    return addReportRow(reportId);
  }

  return addManualRow(reportId);
}

function buildRowCopyPayload(row) {
  if (row?.type === 'tab') {
    return {
      type: 'tab',
      tabId: row.tabId || '',
      groupId: row.groupId || '',
      dateStart: row.dateStart || '',
      dateEnd: row.dateEnd || '',
      savedTotal: Number.isFinite(Number(row.savedTotal)) ? Number(row.savedTotal) : 0
    };
  }

  if (row?.type === 'report') {
    const linkedReport = state.reports.find(report => report._id === row.reportId);
    return {
      type: 'report',
      reportId: row.reportId || '',
      reportName: linkedReport?.name || row.reportName || '',
      savedTotal: Number.isFinite(Number(row.savedTotal)) ? Number(row.savedTotal) : 0
    };
  }

  const amount = Number(row?.amount);
  return {
    type: 'manual',
    title: row?.title || '',
    amount: Number.isFinite(amount) ? amount : 0,
    amountFormula: String(row?.amountFormula || '').trim(),
    amountDisplayType: normalizeManualAmountDisplayType(row?.amountDisplayType)
  };
}

function buildManualAmountInput(row) {
  const formula = String(row?.amountFormula || '').trim();
  if (formula) {
    return `=${formula}`;
  }

  const amount = Number(row?.amount);
  return Number.isFinite(amount) ? String(amount) : '0';
}

function buildRowEditorDraft(row) {
  const nextDraft = { ...row };

  if (nextDraft.type === 'manual') {
    nextDraft.amountInput = buildManualAmountInput(nextDraft);
    nextDraft.amountDisplayType = normalizeManualAmountDisplayType(nextDraft.amountDisplayType);
  }

  if (nextDraft.type === 'report') {
    const linkedReport = state.reports.find(report => report._id === nextDraft.reportId);
    nextDraft.reportName = linkedReport?.name || nextDraft.reportName || '';
  }

  return nextDraft;
}

function buildManualRowPayloadFromDraft(draft) {
  const rawInput = String(draft?.amountInput || '').trim();
  const fallbackAmount = Number(draft?.amount);
  const safeFallbackAmount = Number.isFinite(fallbackAmount) ? fallbackAmount : 0;

  if (rawInput.startsWith('=')) {
    return {
      type: 'manual',
      title: String(draft?.title || ''),
      amount: safeFallbackAmount,
      amountFormula: rawInput.slice(1).trim(),
      amountDisplayType: normalizeManualAmountDisplayType(draft?.amountDisplayType)
    };
  }

  const parsedAmount = Number(rawInput);
  return {
    type: 'manual',
    title: String(draft?.title || ''),
    amount: Number.isFinite(parsedAmount) ? parsedAmount : safeFallbackAmount,
    amountFormula: '',
    amountDisplayType: normalizeManualAmountDisplayType(draft?.amountDisplayType)
  };
}

function openExistingRowPickerModal() {
  if (!hasExistingRows.value || !selectedReport.value?._id) {
    return;
  }

  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  isExistingRowPickerModalOpen.value = true;
}

function closeExistingRowPickerModal() {
  isExistingRowPickerModalOpen.value = false;
}

function addExistingRowFromOption(optionKey) {
  if (!selectedReport.value?._id) {
    closeExistingRowPickerModal();
    return;
  }

  const selectedOption = findExistingRowOption(optionKey);
  if (!selectedOption) {
    closeExistingRowPickerModal();
    return;
  }

  const nextRow = createRowByType(selectedReport.value._id, selectedOption.row.type);
  if (!nextRow) {
    closeExistingRowPickerModal();
    return;
  }

  updateRow(
    selectedReport.value._id,
    nextRow.rowId,
    buildRowCopyPayload(selectedOption.row)
  );

  const copiedRow = selectedReport.value.rows.find(row => row.rowId === nextRow.rowId);
  rowEditorDraft.value = buildRowEditorDraft(copiedRow || nextRow);
  editingRowId.value = nextRow.rowId;
  editingRowWasNew.value = true;
  isRowEditorOpen.value = true;
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  closeExistingRowPickerModal();
}

function openDashboardFromRow(row) {
  if (!row || isReorderingRows.value || row.type !== 'tab') {
    return;
  }

  activeRowMenuId.value = '';

  if (!row.groupId || !row.tabId || !row.dateStart || !row.dateEnd) {
    return;
  }

  const rowTotal = Number(getRowAmount(selectedReport.value?._id, row.rowId));

  router.push({
    name: 'dashboard',
    query: {
      reportGroupId: row.groupId,
      reportTabId: row.tabId,
      reportDateStart: row.dateStart,
      reportDateEnd: row.dateEnd,
      reportRowTotal: Number.isFinite(rowTotal) ? String(rowTotal) : '0'
    }
  });
}

function openReport(reportId) {
  selectedReportId.value = reportId;
  activeReportMenuId.value = '';
  activeFolderMenuName.value = '';
  activeRowMenuId.value = '';
  showListMenu.value = false;
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  closeExistingRowPickerModal();
  isMoveToFolderModalOpen.value = false;
  isReorderingRows.value = false;
  closeFormulaModals();
}

function openReportFromList(reportId) {
  if (isReorderingReports.value) return;
  openReport(reportId);
}

function backToList() {
  if (isDraftSelected.value) {
    const shouldDiscard = confirm('Discard this new report?');
    if (!shouldDiscard) {
      return;
    }

    cancelDraftReport(selectedReport.value._id);
  }

  selectedReportId.value = '';
  activeReportMenuId.value = '';
  activeFolderMenuName.value = '';
  activeRowMenuId.value = '';
  showListMenu.value = false;
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  closeExistingRowPickerModal();
  closeMoveToFolderModal();
  closeFormulaModals();
  isReorderingRows.value = false;
  cancelReportNameEdit();
  cancelRowEditor();
}

function toggleReportMenu(reportId) {
  if (isReorderingReports.value) return;
  activeFolderMenuName.value = '';
  activeReportMenuId.value = activeReportMenuId.value === reportId ? '' : reportId;
}

function toggleFolderMenu(folderName) {
  activeReportMenuId.value = '';
  activeFolderMenuName.value = activeFolderMenuName.value === folderName ? '' : folderName;
}

function folderActionLabel(report) {
  const inFolder = Boolean(String(report?.folderName || '').trim());
  return inFolder ? 'Remove / move to folder' : 'Move to folder';
}

function openMoveToFolderModal(reportId) {
  const report = state.reports.find(item => item._id === reportId);
  if (!report) return;

  moveToFolderReportId.value = reportId;
  selectedFolderOption.value = String(report.folderName || '').trim();
  isCreatingNewFolder.value = false;
  newFolderNameDraft.value = '';
  isMoveToFolderModalOpen.value = true;
  activeReportMenuId.value = '';
}

function closeMoveToFolderModal() {
  if (isMovingReportToFolder.value) return;

  isMoveToFolderModalOpen.value = false;
  moveToFolderReportId.value = '';
  selectedFolderOption.value = '';
  isCreatingNewFolder.value = false;
  newFolderNameDraft.value = '';
}

function closeDropdownMenus() {
  activeReportMenuId.value = '';
  activeFolderMenuName.value = '';
  activeRowMenuId.value = '';
  showListMenu.value = false;
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
}

function openFormulaMenuModal() {
  if (!selectedReport.value?._id) return;

  if (isFormulaEditorModalOpen.value) {
    closeFormulaModals();
    return;
  }

  closeDropdownMenus();
  closeExistingRowPickerModal();
  totalFormulaDraft.value = selectedReport.value?.totalFormula || '';
  totalDisplayTypeDraft.value = selectedReport.value?.totalDisplayType || 'dollar';
  isFormulaMenuModalOpen.value = false;
  isFormulaEditorModalOpen.value = true;
}

function openFormulaEditorModal() {
  if (!selectedReport.value?._id) return;

  totalFormulaDraft.value = selectedReport.value?.totalFormula || '';
  totalDisplayTypeDraft.value = selectedReport.value?.totalDisplayType || 'dollar';
  isFormulaMenuModalOpen.value = false;
  isFormulaEditorModalOpen.value = true;
}

function closeFormulaModals() {
  if (isApplyingReportFormula.value) return;

  isFormulaMenuModalOpen.value = false;
  isFormulaEditorModalOpen.value = false;
  totalFormulaDraft.value = selectedReport.value?.totalFormula || '';
  totalDisplayTypeDraft.value = selectedReport.value?.totalDisplayType || 'dollar';
}

function handleGlobalPointerDown(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const dropdownRoot = target.closest('[data-dropdown-root]');
  if (dropdownRoot instanceof Element && dropdownRoot.querySelector('[data-dropdown-panel]')) {
    return;
  }

  closeDropdownMenus();
}

function startCreatingFolder() {
  isCreatingNewFolder.value = true;
  newFolderNameDraft.value = '';
}

async function applyFolderMove(folderName) {
  const reportId = moveToFolderReportId.value;
  const normalizedFolderName = String(folderName || '').trim();

  if (!reportId || !normalizedFolderName || isMovingReportToFolder.value) {
    return;
  }

  isMovingReportToFolder.value = true;
  const moved = await moveReportToFolder(reportId, normalizedFolderName);
  isMovingReportToFolder.value = false;

  if (!moved) {
    return;
  }

  ensureFolderExpanded(normalizedFolderName);
  closeMoveToFolderModal();
}

async function moveToSelectedFolder() {
  await applyFolderMove(selectedFolderOption.value);
}

async function createFolderAndMove() {
  await applyFolderMove(newFolderNameDraft.value);
}

async function removeFromFolderInModal() {
  const reportId = moveToFolderReportId.value;

  if (!reportId || isMovingReportToFolder.value) {
    return;
  }

  isMovingReportToFolder.value = true;
  const moved = await removeReportFromFolder(reportId);
  isMovingReportToFolder.value = false;

  if (!moved) {
    return;
  }

  closeMoveToFolderModal();
}

async function renameFolderFromMenu(folderName) {
  activeFolderMenuName.value = '';

  const nextFolderName = prompt('Rename folder', folderName);
  if (nextFolderName === null) {
    return;
  }

  const trimmed = String(nextFolderName || '').trim();
  if (!trimmed || trimmed === folderName) {
    return;
  }

  await renameFolder(folderName, trimmed);
  ensureFolderExpanded(trimmed);
}

async function removeFolderFromMenu(folderName) {
  activeFolderMenuName.value = '';

  const confirmed = confirm(`Remove folder "${folderName}"? Reports will stay and become unfiled.`);
  if (!confirmed) {
    return;
  }

  await removeFolder(folderName);
  delete expandedFoldersByName.value[folderName];
}

function toggleRowMenu(rowId) {
  if (isReorderingRows.value) return;
  activeRowMenuId.value = activeRowMenuId.value === rowId ? '' : rowId;
}

async function toggleReorderReports() {
  if (isReorderingReports.value) {
    await finishReorderReports();
    return;
  }

  showListMenu.value = false;
  activeReportMenuId.value = '';
  activeFolderMenuName.value = '';
  reportReorderItems.value = buildReportReorderItems();
  isReorderingReports.value = true;
}

async function finishReorderReports() {
  if (!isReorderingReports.value) return;

  applyReportReorderItems();
  await saveReportsOrder();
  reportReorderItems.value = [];
  isReorderingReports.value = false;
}

function toggleReorderRows() {
  isReorderingRows.value = !isReorderingRows.value;
  activeRowMenuId.value = '';
  showAddRowPicker.value = false;
  showDetailReportMenu.value = false;
  closeExistingRowPickerModal();
  closeFormulaModals();
}

async function onRowsDragEnd() {
  if (!selectedReport.value || !isReorderingRows.value) return;
  await saveReportLayout(selectedReport.value._id);
}

async function finishReorderRows() {
  if (!selectedReport.value) return;
  await saveReportLayout(selectedReport.value._id);
  isReorderingRows.value = false;
}

async function createFirstReport() {
  openCreateReportModal();
}

function openCreateReportModal() {
  isReorderingReports.value = false;
  showListMenu.value = false;
  activeReportMenuId.value = '';
  closeExistingRowPickerModal();
  closeFormulaModals();
  createReportNameDraft.value = '';
  isCreateReportModalOpen.value = true;
}

function cancelCreateReport() {
  if (isCreatingReport.value) return;
  isCreateReportModalOpen.value = false;
  createReportNameDraft.value = '';
}

async function confirmCreateReport() {
  if (!canCreateReport.value || isCreatingReport.value) return;

  isCreatingReport.value = true;
  const report = await createReport(createReportNameDraft.value.trim());
  isCreatingReport.value = false;

  if (!report?._id) return;

  isCreateReportModalOpen.value = false;
  createReportNameDraft.value = '';
  openReport(report._id);
}

function startRenameFromList(report) {
  openReport(report._id);
  startReportNameEdit();
}

function startReportNameEdit() {
  if (!selectedReport.value) return;

  isReorderingRows.value = false;
  isEditingReportName.value = true;
  reportNameDraft.value = selectedReport.value.name;
  showDetailReportMenu.value = false;
}

function cancelReportNameEdit() {
  isEditingReportName.value = false;
  reportNameDraft.value = '';
}

async function saveReportName() {
  if (!selectedReport.value) return;

  updateReportName(selectedReport.value._id, reportNameDraft.value);

  if (isDraftSelected.value) {
    cancelReportNameEdit();
    return;
  }

  const saved = await saveReportLayout(selectedReport.value._id);
  if (saved?._id) {
    selectedReportId.value = saved._id;
    cancelReportNameEdit();
  }
}

async function applyReportFormula() {
  if (!selectedReport.value || isApplyingReportFormula.value) return;

  const reportId = selectedReport.value._id;
  updateReportTotalFormula(reportId, totalFormulaDraft.value);
  updateReportTotalDisplayType(reportId, totalDisplayTypeDraft.value);
  totalFormulaDraft.value = selectedReport.value?.totalFormula || '';
  totalDisplayTypeDraft.value = selectedReport.value?.totalDisplayType || 'dollar';

  if (isDraftSelected.value) {
    closeFormulaModals();
    return;
  }

  isApplyingReportFormula.value = true;

  try {
    const saved = await saveReportLayout(reportId);
    if (saved?._id) {
      selectedReportId.value = saved._id;
      totalFormulaDraft.value = String(saved.totalFormula || '').trim();
      totalDisplayTypeDraft.value = String(saved.totalDisplayType || '').trim().toLowerCase() === 'percentage'
        ? 'percentage'
        : 'dollar';
    }
  } finally {
    isApplyingReportFormula.value = false;
  }

  closeFormulaModals();
}

async function clearReportFormula() {
  totalFormulaDraft.value = '';
  await applyReportFormula();
}

async function saveDraftReport() {
  if (!selectedReport.value || !isDraftSelected.value) return;

  const saved = await saveReport(selectedReport.value._id);
  if (saved?._id) {
    selectedReportId.value = saved._id;
  }
}

function cancelDraftAndBack() {
  if (!selectedReport.value || !isDraftSelected.value) return;

  const shouldDiscard = confirm('Discard this new report?');
  if (!shouldDiscard) return;

  cancelDraftReport(selectedReport.value._id);
  selectedReportId.value = '';
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  closeExistingRowPickerModal();
}

function startRowEdit(row) {
  rowEditorDraft.value = buildRowEditorDraft(row);
  editingRowId.value = row.rowId;
  editingRowWasNew.value = false;
  isRowEditorOpen.value = true;
  activeRowMenuId.value = '';
}

function addAndEditRow(type) {
  if (!selectedReport.value) return;
  if (type === 'report' && !hasSelectableLinkedReports.value) return;

  let newRow = null;
  if (type === 'tab') {
    newRow = addTabRow(selectedReport.value._id);
  } else if (type === 'report') {
    newRow = addReportRow(selectedReport.value._id);
  } else {
    newRow = addManualRow(selectedReport.value._id);
  }

  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
  closeExistingRowPickerModal();

  if (!newRow) return;

  rowEditorDraft.value = buildRowEditorDraft(newRow);
  editingRowId.value = newRow.rowId;
  editingRowWasNew.value = true;
  isRowEditorOpen.value = true;
}

function cancelRowEditor() {
  if (isSavingRow.value) return;

  if (selectedReport.value && editingRowWasNew.value && editingRowId.value) {
    removeRow(selectedReport.value._id, editingRowId.value);
  }

  rowEditorDraft.value = null;
  editingRowId.value = '';
  editingRowWasNew.value = false;
  isRowEditorOpen.value = false;
}

function onRowEditorBackdropClick() {
  if (isManualRowEditor.value) {
    return;
  }

  cancelRowEditor();
}

async function persistRowEditorChanges(reportId, rowId, { wasNewRow = false, wasDraftSelected = false } = {}) {
  await refreshRowTotal(reportId, rowId, { forceTransactionReload: true });

  if (wasDraftSelected) {
    return;
  }

  const saved = wasNewRow
    ? await saveReportLayout(reportId)
    : await saveReport(reportId);

  if (saved?._id) {
    selectedReportId.value = saved._id;
  }
}

async function saveRowEditor() {
  if (!selectedReport.value || !rowEditorDraft.value || !editingRowId.value || isSavingRow.value) return;

  isSavingRow.value = true;
  const reportId = selectedReport.value._id;
  const rowId = editingRowId.value;
  const wasNewRow = editingRowWasNew.value;
  const wasDraftSelected = isDraftSelected.value;
  let didApplyLocalUpdate = false;

  try {
    const payload = { ...rowEditorDraft.value };

    if (payload.type === 'report') {
      const linkedReport = state.reports.find(report => report._id === payload.reportId);
      payload.reportName = linkedReport?.name || payload.reportName || '';
    }

    if (payload.type === 'manual') {
      Object.assign(payload, buildManualRowPayloadFromDraft(payload));
      delete payload.amountInput;
    }

    updateRow(reportId, rowId, payload);
    didApplyLocalUpdate = true;

    rowEditorDraft.value = null;
    editingRowId.value = '';
    editingRowWasNew.value = false;
    isRowEditorOpen.value = false;
  } finally {
    isSavingRow.value = false;
  }

  if (!didApplyLocalUpdate) {
    return;
  }

  void persistRowEditorChanges(reportId, rowId, { wasNewRow, wasDraftSelected });
}

async function refreshSelectedReport() {
  if (!selectedReport.value) return;

  showDetailReportMenu.value = false;
  await refreshReportTotals(selectedReport.value._id);
}

async function copyReport(reportId) {
  if (!reportId || duplicatingReportId.value) return;

  duplicatingReportId.value = reportId;
  const copied = await duplicateReport(reportId);
  duplicatingReportId.value = '';

  if (!copied?._id) {
    return;
  }

  activeReportMenuId.value = '';
  showDetailReportMenu.value = false;
  openReport(copied._id);
}

async function refreshReportFromList(reportId) {
  activeReportMenuId.value = '';
  await refreshReportTotals(reportId);
}

async function deleteRowAndSave(rowId) {
  if (!selectedReport.value) return;

  removeRow(selectedReport.value._id, rowId);
  activeRowMenuId.value = '';

  if (!isDraftSelected.value) {
    await saveReport(selectedReport.value._id);
  }
}

async function confirmDeleteReport(reportId) {
  const shouldDelete = confirm('Delete this report?');
  if (!shouldDelete) {
    return;
  }

  await deleteReport(reportId);

  if (selectedReportId.value === reportId) {
    selectedReportId.value = '';
  }

  if (moveToFolderReportId.value === reportId) {
    closeMoveToFolderModal();
  }

  activeReportMenuId.value = '';
  showDetailReportMenu.value = false;
  showAddRowPicker.value = false;
}

function parseDateInput(value) {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

function setDraftDateRange(startDate, endDate) {
  if (!rowEditorDraft.value || rowEditorDraft.value.type !== 'tab') return;

  rowEditorDraft.value.dateStart = formatDate(startDate, 'yyyy-MM-dd');
  rowEditorDraft.value.dateEnd = formatDate(endDate, 'yyyy-MM-dd');
}

function applyQuickSelect(period) {
  if (!rowEditorDraft.value || rowEditorDraft.value.type !== 'tab') return;

  const today = new Date();
  const currentStart = parseDateInput(rowEditorDraft.value.dateStart);
  const currentEnd = parseDateInput(rowEditorDraft.value.dateEnd);

  const monthRange =
    isSameMonth(currentStart, currentEnd)
    && formatDate(currentStart, 'yyyy-MM-dd') === formatDate(startOfMonth(currentStart), 'yyyy-MM-dd')
    && formatDate(currentEnd, 'yyyy-MM-dd') === formatDate(endOfMonth(currentEnd), 'yyyy-MM-dd');

  const yearRange =
    isSameYear(currentStart, currentEnd)
    && formatDate(currentStart, 'yyyy-MM-dd') === formatDate(startOfYear(currentStart), 'yyyy-MM-dd')
    && formatDate(currentEnd, 'yyyy-MM-dd') === formatDate(endOfYear(currentEnd), 'yyyy-MM-dd');

  switch (period) {
    case 'today':
      setDraftDateRange(today, today);
      break;
    case 'prevMonth': {
      const base = monthRange ? subMonths(currentStart, 1) : subMonths(today, 1);
      setDraftDateRange(startOfMonth(base), endOfMonth(base));
      break;
    }
    case 'nextMonth': {
      const base = monthRange ? addMonths(currentStart, 1) : addMonths(today, 1);
      setDraftDateRange(startOfMonth(base), endOfMonth(base));
      break;
    }
    case 'prevYear': {
      const base = yearRange ? subYears(currentStart, 1) : subYears(today, 1);
      setDraftDateRange(startOfYear(base), endOfYear(base));
      break;
    }
    case 'nextYear': {
      const base = yearRange ? addYears(currentStart, 1) : addYears(today, 1);
      setDraftDateRange(startOfYear(base), endOfYear(base));
      break;
    }
    case 'last30Days':
      setDraftDateRange(subDays(today, 30), today);
      break;
    case 'last90Days':
      setDraftDateRange(subDays(today, 90), today);
      break;
    default:
      break;
  }
}

onMounted(() => {
  initReports();
  window.addEventListener('pointerdown', handleGlobalPointerDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown);
});
</script>

<style scoped>
.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--theme-menu-item-text);
}

.menu-item:hover {
  background: var(--theme-menu-item-hover-bg);
}

.btn-primary {
  border-radius: 0.6rem;
  padding: 0.55rem 0.9rem;
  background: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
  font-size: 0.85rem;
  font-weight: 800;
}

.btn-primary:hover {
  background: var(--theme-btn-primary-hover-bg);
}

.btn-secondary {
  border-radius: 0.6rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--theme-btn-secondary-border);
  color: var(--theme-btn-secondary-text);
  font-size: 0.85rem;
  font-weight: 700;
}

.btn-secondary:hover {
  background: var(--theme-btn-secondary-hover-bg);
}


</style>
