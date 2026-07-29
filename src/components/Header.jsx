function Header({title}) {
    return(
        <header>
            <h1>{title}</h1>
            <nav>
                <a href="/">Home</a>
                <a href="/me"></a>
            </nav>
        </header>
    )
}

export default Header