<template>
    <form @submit.prevent="submitCode" class="max-w-md mx-auto p-8 space-y-6">
        <div class="text-center">
            <h3 class="text-lg font-medium text-gray-900">
                Please Enter the verification code sent to
                <span class="block mt-1">
                    <b v-if="user" class="text-blue-600">{{ user.email }}</b>
                    <span v-else>your email</span>
                </span>
            </h3>
        </div>

        <div class="grid grid-cols-6 gap-2">
            <div v-for="index in code.length" :key="index">
                <input 
                    type="number" 
                    max="9"
                    :id="'code'+index"
                    @keydown="handleKeydown($event, index)"
                    class="w-full h-16 text-center text-2xl font-bold border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
            </div>
        </div>

        <Transition>
            <div v-if="notification" class="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                <b>{{ notification }}</b>
            </div>
        </Transition>

        <div class="text-center text-sm">
            Didn't get it? 
            <button 
                @click.prevent="sendAnotherCode" 
                class="text-blue-600 hover:text-blue-800 font-medium"
            >
                Send Another Code »
            </button>
        </div>
    </form>
</template>
  
<script setup>
    import { ref, onMounted } from 'vue';
    import { useAppStore } from '@/stores/state';
    const { State, api } = useAppStore();
  
    let user = ref(State.user);
    const code = ref(['', '', '', '', '', '']);
    const notification = ref(false);
    const baseUrl = '/api';

    const getInputEl = (index) => {
        const id = 'code'+index;
        return document.getElementById(id);
    }

    const handleKeydown = (event, index) => {
        const pressedKey = event.data || event.key;
        const keyCode = event.keyCode || event.which;

        const isBackSpace = event.code === 'Backspace' || [8,46].includes(keyCode);
        const isLeftArrow = event.code === 'ArrowLeft' || keyCode === 37;
        const isRightArrow = event.code === 'ArrowRight' || keyCode === 39

        const $prevInput = getInputEl(index-1);
        const $nextInput = getInputEl(index+1);

        if(isLeftArrow) {
            return $prevInput.focus();
        }

        if(isRightArrow) {
            return $nextInput.focus();
        }
        
        if(isBackSpace && event.target.value === '') {
            if(index > 1) {
                setTimeout(() => $prevInput.focus(), 40);
            }
            return;
        }

        if(isBackSpace) {
            event.target.value = '';
            code.value[index-1] = '';
            return;
        }

        if(isNaN(pressedKey)) {
            return;
        }
        
        setTimeout(() => {
            getInputEl(index).value = pressedKey;    
        }, 40);

        code.value[index-1] = pressedKey;
        
        if(index<code.value.length) {
            setTimeout(() => $nextInput.focus(), 50);
            return;
        }

        submitCode(code.value);
    }

    const notify = (message) => {
        notification.value = message;

        setTimeout(() => {
            notification.value = false;
        }, 3*1000);
    }

    const sendAnotherCode = () => {
        api.post(baseUrl+'/signup/resend').then(notify);
    }
  
    const submitCode = (codeValue) => {
        const code = codeValue.slice().join('');
        const body = { code };

        api.post(baseUrl+'/signup/verify', body).then(notify);
    };

    onMounted(async () => {
        const $firstInput = getInputEl(1);
        $firstInput.focus();
    });
</script>

<style scoped>
    input {
        height: 4em;
    }
</style>