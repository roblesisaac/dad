<template>
  <main class="min-h-screen bg-white pb-28">
    <div class="max-w-5xl mx-auto w-full relative">
      <!-- Sticky Navigation Header -->
      <div class="sticky top-0 z-20 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-4 mb-2 transition-all">
        <!-- Left: Dashboard -->
        <button 
          @click="router.push('/dashboard')" 
          class="flex items-center gap-1.5 hover:opacity-70 transition-opacity group focus:outline-none"
        >
          <ChevronLeft class="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" />
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em]">
            Dashboard
          </span>
        </button>

        <!-- Right: Logout -->
        <button 
          @click="logoutUser" 
          class="flex items-center gap-1.5 hover:opacity-70 transition-opacity group focus:outline-none"
        >
          <span class="font-black text-black text-xs sm:text-sm uppercase tracking-[0.2em]">
            Logout
          </span>
          <LogOut class="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" />
        </button>
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
            class="space-y-4"
            handle=".drag-handle-top"
          >
            <template #item="{ element: item }">
              <article
                v-if="item.type === 'report'"
                class="relative border-2 border-dashed border-gray-300 rounded-2xl p-4 bg-white shadow-sm transition-colors"
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

                    <h2 class="text-xl font-black text-gray-900 truncate">
                      {{ item.reportName }}
                    </h2>
                  </div>

                  <span class="text-lg font-black" :class="fontColor(getReportTotal(item.reportId))">
                    {{ formatPrice(getReportTotal(item.reportId), { toFixed: 2 }) }}
                  </span>
                </div>
              </article>

              <section
                v-else
                class="border-2 border-dashed border-gray-300 rounded-2xl bg-white shadow-sm"
              >
                <div class="w-full px-4 py-3 flex items-center justify-between rounded-2xl">
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
                      <ChevronDown
                        v-if="folderIsExpanded(item.folderName)"
                        class="w-4 h-4 text-gray-500 flex-shrink-0"
                      />
                      <ChevronRight
                        v-else
                        class="w-4 h-4 text-gray-500 flex-shrink-0"
                      />
                      <Folder class="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span class="text-base font-black text-gray-900 truncate">{{ item.folderName }}</span>
                    </button>
                  </div>

                  <span class="text-xs font-bold text-gray-500">{{ item.reports.length }}</span>
                </div>

                <div v-if="folderIsExpanded(item.folderName)" class="px-3 pb-3">
                  <draggable
                    v-model="item.reports"
                    item-key="key"
                    class="space-y-2"
                    handle=".drag-handle-nested"
                  >
                    <template #item="{ element: folderReport }">
                      <article class="relative border border-gray-200 rounded-xl p-3 bg-white">
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex items-start gap-2 min-w-0">
                            <button
                              class="drag-handle-nested mt-0.5 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-move"
                              @click.stop
                              title="Drag to reorder"
                            >
                              <GripVertical class="w-4 h-4" />
                            </button>

                            <h3 class="text-base font-black text-gray-900 truncate">{{ folderReport.reportName }}</h3>
                          </div>

                          <span class="text-base font-black" :class="fontColor(getReportTotal(folderReport.reportId))">
                            {{ formatPrice(getReportTotal(folderReport.reportId), { toFixed: 2 }) }}
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
          <div class="space-y-4">
            <template v-for="item in topLevelReportItems" :key="item.key">
              <article
                v-if="item.type === 'report'"
                class="relative border-2 border-gray-100 rounded-2xl p-4 bg-white shadow-sm transition-colors cursor-pointer hover:border-gray-200"
                @click="openReportFromList(item.report._id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <h2 class="text-xl font-black text-gray-900 truncate">{{ item.report.name }}</h2>

                  <div class="flex items-center gap-2">
                    <span class="text-lg font-black" :class="fontColor(getReportTotal(item.report._id))">
                      {{ formatPrice(getReportTotal(item.report._id), { toFixed: 2 }) }}
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
                class="border-2 border-gray-100 rounded-2xl bg-white shadow-sm"
              >
                <div class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-2xl">
                  <button
                    class="flex items-center gap-2 min-w-0 flex-1 text-left"
                    @click="toggleFolderExpansion(item.folderName)"
                  >
                    <ChevronDown
                      v-if="folderIsExpanded(item.folderName)"
                      class="w-4 h-4 text-gray-500 flex-shrink-0"
                    />
                    <ChevronRight
                      v-else
                      class="w-4 h-4 text-gray-500 flex-shrink-0"
                    />
                    <Folder class="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span class="text-base font-black text-gray-900 truncate">{{ item.folderName }}</span>
                  </button>

                  <div class="flex items-center gap-2 ml-2">
                    <span class="text-xs font-bold text-gray-500">{{ item.reports.length }}</span>
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
                  </div>
                </div>

                <div v-if="folderIsExpanded(item.folderName)" class="px-3 pb-3 space-y-2">
                  <article
                    v-for="report in item.reports"
                    :key="report._id"
                    class="relative border border-gray-200 rounded-xl p-3 bg-white cursor-pointer hover:border-gray-300"
                    @click="openReportFromList(report._id)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <h3 class="text-base font-black text-gray-900 truncate">{{ report.name }}</h3>

                      <div class="flex items-center gap-2">
                        <span class="text-base font-black" :class="fontColor(getReportTotal(report._id))">
                          {{ formatPrice(getReportTotal(report._id), { toFixed: 2 }) }}
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

        <button
          class="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-black text-white shadow-xl hover:bg-gray-800 flex items-center justify-center"
          :class="isReorderingReports ? 'opacity-50 cursor-not-allowed' : ''"
          :disabled="isReorderingReports"
          @click="createNewReportFromFab"
          title="Create report"
        >
          <Plus class="w-6 h-6" />
        </button>
      </template>

      <template v-else>
        <header class="mb-6 flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <button class="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-600" @click="backToList">
              <ChevronLeft class="w-4 h-4" />
            </button>

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
                <h1 class="text-3xl font-black tracking-tight text-gray-900 truncate">{{ selectedReport.name }}</h1>
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
            <template #item="{ element: row }">
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
                      <div class="text-lg font-bold text-gray-900 truncate">
                        {{ rowTitle(row) }}
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
                      {{ formatPrice(getRowAmount(selectedReport._id, row.rowId), { toFixed: 2 }) }}
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

        <div class="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
          <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Report Total</span>
            <span class="text-xl font-black" :class="fontColor(getReportTotal(selectedReport._id))">
              {{ formatPrice(getReportTotal(selectedReport._id), { toFixed: 2 }) }}
            </span>
          </div>
        </div>
      </template>

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
        class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
        @click.self="cancelRowEditor"
      >
        <div class="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 md:p-6">
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
                Group
                <select v-model="rowEditorDraft.groupId" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select group</option>
                  <option v-for="group in sortedGroups" :key="group._id" :value="group._id">{{ group.name }}</option>
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
                Amount
                <input v-model.number="rowEditorDraft.amount" type="number" step="0.01" class="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </label>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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
import { Check, ChevronDown, ChevronLeft, ChevronRight, Folder, GripVertical, LogOut, MoreVertical, Plus } from 'lucide-vue-next';
import draggable from 'vuedraggable';
import { useRouter } from 'vue-router';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import ReportsEmptyState from '@/features/reports/components/ReportsEmptyState.vue';
import { useReportsState } from '@/features/reports/composables/useReportsState.js';
import { useUtils } from '@/shared/composables/useUtils.js';
import { useAuth } from '@/shared/composables/useAuth';

const router = useRouter();
const { logoutUser } = useAuth();
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

const isRowEditorOpen = ref(false);
const rowEditorDraft = ref(null);
const editingRowId = ref('');
const editingRowWasNew = ref(false);
const isSavingRow = ref(false);
const isCreateReportModalOpen = ref(false);
const createReportNameDraft = ref('');
const isCreatingReport = ref(false);
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
  return sortedGroups.value.find(group => group._id === groupId)?.name || 'Group not found';
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
    amount: Number.isFinite(amount) ? amount : 0
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
  rowEditorDraft.value = copiedRow ? { ...copiedRow } : { ...nextRow };
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

async function createNewReportFromFab() {
  openCreateReportModal();
}

function openCreateReportModal() {
  isReorderingReports.value = false;
  showListMenu.value = false;
  activeReportMenuId.value = '';
  closeExistingRowPickerModal();
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

  const saved = await saveReport(selectedReport.value._id);
  if (saved?._id) {
    selectedReportId.value = saved._id;
    cancelReportNameEdit();
  }
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
  const nextDraft = { ...row };
  if (nextDraft.type === 'report') {
    const linkedReport = state.reports.find(report => report._id === nextDraft.reportId);
    nextDraft.reportName = linkedReport?.name || nextDraft.reportName || '';
  }

  rowEditorDraft.value = nextDraft;
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

  rowEditorDraft.value = { ...newRow };
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

async function saveRowEditor() {
  if (!selectedReport.value || !rowEditorDraft.value || !editingRowId.value || isSavingRow.value) return;

  isSavingRow.value = true;

  try {
    const reportId = selectedReport.value._id;
    const rowId = editingRowId.value;
    const payload = { ...rowEditorDraft.value };

    if (payload.type === 'report') {
      const linkedReport = state.reports.find(report => report._id === payload.reportId);
      payload.reportName = linkedReport?.name || payload.reportName || '';
    }

    updateRow(reportId, rowId, payload);
    await refreshRowTotal(reportId, rowId, { forceTransactionReload: true });

    if (!isDraftSelected.value) {
      const saved = editingRowWasNew.value
        ? await saveReportLayout(reportId)
        : await saveReport(reportId);

      if (saved?._id) {
        selectedReportId.value = saved._id;
      }
    }

    rowEditorDraft.value = null;
    editingRowId.value = '';
    editingRowWasNew.value = false;
    isRowEditorOpen.value = false;
  } finally {
    isSavingRow.value = false;
  }
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
  color: #1f2937;
}

.menu-item:hover {
  background: #f9fafb;
}

.btn-primary {
  border-radius: 0.6rem;
  padding: 0.55rem 0.9rem;
  background: #111827;
  color: white;
  font-size: 0.85rem;
  font-weight: 800;
}

.btn-primary:hover {
  background: #1f2937;
}

.btn-secondary {
  border-radius: 0.6rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid #d1d5db;
  color: #374151;
  font-size: 0.85rem;
  font-weight: 700;
}

.btn-secondary:hover {
  background: #f9fafb;
}


</style>
