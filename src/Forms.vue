<!--
  - @copyright Copyright (c) 2018 René Gieling <github@dartcafe.de>
  -
  - @author René Gieling <github@dartcafe.de>
  - @author John Molakvoæ <skjnldsv@protonmail.com>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program.  If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<Content app-name="forms">
		<AppNavigation>
			<AppNavigationNew button-class="icon-add" :text="t('forms', 'New form')" @click="onNewForm" />
			<template #list>
				<!-- Form-Owner-->
				<AppNavigationItem
					icon="icon-home"
					:title="t('forms', 'Owned Forms')"
					:allow-collapse="true"
					:open="true">
					<template #default>
						<AppNavigationForm v-for="form in forms.owned"
							:key="form.id"
							:form="form"
							:read-only="false"
							@mobile-close-navigation="mobileCloseNavigation"
							@delete="onDeleteForm" />
					</template>
				</AppNavigationItem>

				<!-- Shared Forms-->
				<AppNavigationSpacer />
				<AppNavigationItem
					icon="icon-shared"
					:title="t('forms', 'Shared with me')"
					:allow-collapse="true"
					:open="true">
					<template #default>
						<AppNavigationForm v-for="form in forms.shared"
							:key="form.id"
							:form="form"
							:read-only="true"
							@mobile-close-navigation="mobileCloseNavigation"
							@delete="onDeleteForm" />
					</template>
				</AppNavigationItem>
			</template>
		</AppNavigation>

		<!-- No forms & loading emptycontents -->
		<AppContent v-if="loading || noForms || !routeHash">
			<EmptyContent v-if="loading" icon="icon-loading">
				{{ t('forms', 'Loading forms …') }}
			</EmptyContent>
			<EmptyContent v-else-if="noForms">
				{{ t('forms', 'No forms created yet') }}
				<template #action>
					<button class="primary" @click="onNewForm">
						{{ t('forms', 'Create a form') }}
					</button>
				</template>
			</EmptyContent>

			<EmptyContent v-else>
				{{ t('forms', 'Select a form or create a new one') }}
				<template #action>
					<button class="primary" @click="onNewForm">
						{{ t('forms', 'Create new form') }}
					</button>
				</template>
			</EmptyContent>
		</AppContent>

		<!-- No errors show router content -->
		<template v-else>
			<router-view :form.sync="selectedForm" />
			<router-view v-if="!selectedForm.partial"
				:form="selectedForm"
				name="sidebar" />
		</template>
	</Content>
</template>

<script>
import { emit } from '@nextcloud/event-bus'
import { showError } from '@nextcloud/dialogs'
import { generateOcsUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'

import AppContent from '@nextcloud/vue/dist/Components/AppContent'
import AppNavigation from '@nextcloud/vue/dist/Components/AppNavigation'
import AppNavigationItem from '@nextcloud/vue/dist/Components/AppNavigationItem'
import AppNavigationNew from '@nextcloud/vue/dist/Components/AppNavigationNew'
import AppNavigationSpacer from '@nextcloud/vue/dist/Components/AppNavigationSpacer'
import Content from '@nextcloud/vue/dist/Components/Content'
import isMobile from '@nextcloud/vue/src/mixins/isMobile'

import AppNavigationForm from './components/AppNavigationForm'
import EmptyContent from './components/EmptyContent'
import OcsResponse2Data from './utils/OcsResponse2Data'

export default {
	name: 'Forms',

	components: {
		AppNavigationForm,
		AppContent,
		AppNavigation,
		AppNavigationItem,
		AppNavigationNew,
		AppNavigationSpacer,
		Content,
		EmptyContent,
	},

	mixins: [isMobile],

	data() {
		return {
			loading: true,
			forms: {
				owned: [],
				shared: [],
			},
		}
	},

	computed: {
		noForms() {
			return this.forms && (this.forms.owned.length === 0) && (this.forms.shared.length === 0)
		},

		routeHash() {
			// If the form is not within the owned or shared list, the user has no access on internal view.
			if (this.$route.params.hash && this.forms.owned.concat(this.forms.shared).findIndex(form => form.hash === this.$route.params.hash) < 0) {
				console.error('Form not found for hash: ', this.$route.params.hash)
				return undefined
			}
			return this.$route.params.hash
		},

		selectedForm: {
			get() {
				return this.forms.owned.concat(this.forms.shared).find(form => form.hash === this.routeHash)
			},
			set(form) {
				// If a owned form
				let index = this.forms.owned.findIndex(search => search.hash === this.routeHash)
				if (index > -1) {
					this.$set(this.forms.owned, index, form)
					return
				}
				// Otherwise a shared form
				index = this.forms.shared.findIndex(search => search.hash === this.routeHash)
				if (index > -1) {
					this.$set(this.forms.shared, index, form)
				}
			},
		},
	},

	beforeMount() {
		this.loadForms()
	},

	methods: {
		/**
		 * Closes the App-Navigation on mobile-devices
		 */
		mobileCloseNavigation() {
			if (this.isMobile) {
				emit('toggle-navigation', { open: false })
			}
		},

		/**
		 * Initial forms load
		 */
		async loadForms() {
			this.loading = true

			// Load Owned forms
			try {
				const response = await axios.get(generateOcsUrl('apps/forms/api/v1', 2) + 'forms')
				this.forms.owned = OcsResponse2Data(response)
			} catch (error) {
				showError(t('forms', 'An error occurred while loading the forms list'))
				console.error(error)
			}

			// Load shared forms
			try {
				const response = await axios.get(generateOcsUrl('apps/forms/api/v1', 2) + 'forms/shared')
				this.forms.shared = OcsResponse2Data(response)
			} catch (error) {
				showError(t('forms', 'An error occurred while loading the forms list'))
				console.error(error)
			}

			this.loading = false
		},

		/**
		 *
		 */
		async onNewForm() {
			try {
				// Request a new empty form
				const response = await axios.post(generateOcsUrl('apps/forms/api/v1', 2) + 'form')
				const newForm = OcsResponse2Data(response)
				this.forms.owned.unshift(newForm)
				this.$router.push({ name: 'edit', params: { hash: newForm.hash } })
				this.mobileCloseNavigation()
			} catch (error) {
				showError(t('forms', 'Unable to create a new form'))
				console.error(error)
			}
		},

		/**
		 * Remove form from forms list after successful server deletion request
		 *
		 * @param {Number} id the form id
		 */
		async onDeleteForm(id) {
			const formIndex = this.forms.owned.findIndex(form => form.id === id)
			const deletedHash = this.forms.owned[formIndex].hash

			this.forms.owned.splice(formIndex, 1)

			// Redirect if current form has been deleted
			if (deletedHash === this.routeHash) {
				this.$router.push({ name: 'root' })
			}
		},
	},
}
</script>
