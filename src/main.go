package main

import "os"

var (
	cwd string
)

func init() {
	var err error

	cwd, err = os.Getwd()

	if err != nil {
		panic(err)
	}
}

func main() {

}
