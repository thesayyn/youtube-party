<script>
    export let name;
    export let content;
    export let avatar;
    export let announcement;
</script>

<div class:announcement>
    <img alt="profile" src={avatar} />
    <div>
        <h4>{name}</h4>
        <p>{content}</p>
    </div>
</div>

<style>
    div {
        display: flex;
    }

    div img {
        width: 36px;
        height: 36px;
    }

  

    div div {
        display: flex;
        flex-flow: column;
        margin-left: 14px;
    }

    div div h4 {
        font-size: 14px;
        margin: 0;
        color: #fafafa;
    }

    div div p {
        margin: 0;
        font-size: 14px;
        color: #fff;
 
    }

    div.announcement div p {
        color: #787878;
        font-style: italic;
    }
</style>
