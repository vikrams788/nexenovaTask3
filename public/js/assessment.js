const question = document.getElementById('question');
const choices = document.getElementsByClassName('choice-text');
const questionCounterText = document.getElementById('questionCounter');
const scoreText = document.getElementById('score');
const game = document.getElementById('game');

let currentQuestion = {};
let acceptingAnswers = false;
let score = 0;
scoreText.innerText = score;
let questionCounter = 0;
let availableQuestions = [];

let questions = [];

fetch("https://opentdb.com/api.php?amount=3&category=18&difficulty=easy&type=multiple").then(res => {
    console.log(res);
    return res.json();
}).then(loadedQuestions => {
    console.log(loadedQuestions.results);
    questions = loadedQuestions.results.map(loadedQuestion =>{
        formattedQuestion = {
            question: loadedQuestion.question
        };

        const answerChoices = [...loadedQuestion.incorrect_answers];
        formattedQuestion.answer = Math.floor(Math.random()*3)+1;
        answerChoices.splice(formattedQuestion.answer-1, 0, loadedQuestion.correct_answer);

        answerChoices.forEach((choice, index) => {
            formattedQuestion["choice" + (index+1)] = choice;
        });

        return formattedQuestion;
    });
    startGame();
}).catch(err => {
    console.log(err);
});

const CORRECT_BONUS = 10;
const MAX_QUESTIONS = 10;

startGame = () =>{
    questionCounter = 0;
    score = 0;
    availableQuestions = [...questions];
    getNewQuestions();
    game.classList.remove('hidden');
};

getNewQuestions = () => {
    if(availableQuestions.length === 0 || questionCounter>=MAX_QUESTIONS){
        localStorage.setItem('mostRecentScore', score);
        //go to the end page!
        return window.location.assign('end');
    }
    questionCounter++;
    questionCounterText.innerText = questionCounter + "/" + MAX_QUESTIONS;
    const questionIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQuestion = availableQuestions[questionIndex];
    question.innerText = currentQuestion.question;


    const choices = [...document.getElementsByClassName('choice-text')];
    choices.forEach( choice => {
        const number = choice.dataset['number'];
        choice.innerText = currentQuestion['choice' + number];
    });
    
    availableQuestions.splice(questionIndex, 1);

    acceptingAnswers = true;
};

document.addEventListener('DOMContentLoaded', () => {
    Array.prototype.forEach.call(choices, choice => {
        choice.onclick = (e) => {
            if(!acceptingAnswers){
                return;
            }
            acceptingAnswers = false;
            const selectedChoice = e.target;
            const selectedAnswer = parseInt(selectedChoice.dataset['number']);
            
            let classToApply = 'incorrect';
            if(selectedAnswer == currentQuestion.answer){
                classToApply = 'correct';
                score = score+CORRECT_BONUS;
                scoreText.innerText = score;
            }

            choices[selectedAnswer - 1].parentElement.classList.add(classToApply);

            setTimeout(() => {
                choices[selectedAnswer - 1].parentElement.classList.remove(classToApply);
                getNewQuestions();
            }, 1000)
        };
    });
});