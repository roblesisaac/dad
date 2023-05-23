<template>
    <form @submit.prevent="submitCode" class="p30 grid">
        <div class="cell-1">
            <h3>Please Enter the verification code sent to
            <b v-if="user"><br>{{ user.email }}</b><span v-else>your email</span>:</h3>
        </div>

        <div v-for="index in code.length" :class="'cell-1-'+code.length">
            <div class="grid p5r">
                <div class="cell-1">
                    <input type="number" max="9" 
                        :id="'code'+index"
                        @keydown="handleKeydown($event, index)">
                </div>
            </div>
        </div>

        <transition>
        <div v-if="notification" class="cell-1 p10t">
            <div class="grid">
                <div class="cell-1 p30 bgLightRed colorBleach r5 shadow">
                    <b>{{  notification }}</b>
                </div>
            </div>
        </div>
        </transition>

        <div class="cell-1 p20t">
            Didn't get it? <a href="#" @click.prevent="sendAnotherCode">Send Another Code »</a>
        </div>
    </form>
</template>
  
<script setup>
    import { ref, onMounted } from 'vue';
    import { useAppStore } from '../stores/app';
    const { state, api } = useAppStore();
  
    let user = ref(state.user);
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