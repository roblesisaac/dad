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
                        v-model="code[index-1]" 
                        @input="moveToNextInput($event, index)" 
                        @keydown="deleteAndOrGoBack($event, index)">
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

    const getInputEl = (index) => {
        const id = 'code'+index;
        return document.getElementById(id);
    }

    const deleteAndOrGoBack = (event, index) => {
        const keyCode = event.keyCode || event.which;
        const isBackSpace = keyCode === 8 || keyCode === 46;

        if(isBackSpace && index > 1) {
            const input = getInputEl(index-1);
            const goBack = () => input.focus();

            event.target.value = code.value[index-1] = '';
            setTimeout(goBack, 10);
        }
    }

    const moveToNextInput = (event, index) => {
        const value = event.target.value;

        if(value > 9) {
            event.target.value = '';
            code.value[index-1] = '';
        }

        if(index === code.value.length) {
            return submitCode(code.value)
        }

        const input = getInputEl(index+1);

        if (value && input) {
            input.focus();
        }
    };

    const notify = (message) => {
        notification.value = message;

        setTimeout(() => {
            notification.value = false;
        }, 3*1000);
    }

    const sendAnotherCode = () => {
        api.post('/signup/resend').then(notify);
    }
  
    const submitCode = (codeValue) => {
        const code = codeValue.slice().join('');
        const body = { code };

        api.post('/signup/verify', body).then(notify);
    };

    onMounted(async () => {
        const firstInput = getInputEl(1);
        firstInput.focus();
    });
</script>

<style scoped>
    input {
        height: 4em;
    }
</style>